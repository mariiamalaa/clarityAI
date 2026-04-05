import math
import os
import time
import unittest
from pathlib import Path

# macOS: xgboost and torch may both link OpenMP; training N-BEATS after XGB can abort without this.
os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")


def _tryImport(moduleName: str):
    try:
        return __import__(moduleName)
    except Exception:
        return None


class TestModelWrappers(unittest.TestCase):
    def setUp(self) -> None:
        import numpy as np
        import pandas as pd

        self.np = np
        self.pd = pd

        self.series = pd.Series(
            (np.sin(np.arange(60) / 6.0) * 10.0 + np.linspace(100.0, 130.0, 60)),
            index=pd.date_range("2020-01-01", periods=60, freq="MS"),
        )

    def _assertForecastDict(self, out, *, horizon: int, modelName: str):
        self.assertIsInstance(out, dict)
        self.assertEqual(out.get("model"), modelName)
        for k in ["dates", "yhat", "yhat_lower", "yhat_upper"]:
            self.assertIn(k, out)
            self.assertEqual(len(out[k]), horizon)

    def testEtsForecastFormat(self):
        from src.models.ets import ets_forecast

        out = ets_forecast(self.series, horizon=6, seasonal_periods=12)
        self._assertForecastDict(out, horizon=6, modelName="ETS")

    def testThetaForecastFormatOrSkip(self):
        statsmodels = _tryImport("statsmodels")
        if statsmodels is None:
            self.skipTest("statsmodels not installed; skipping Theta tests")

        from src.models.theta import theta_forecast, ThetaUnavailable

        try:
            out = theta_forecast(self.series, horizon=6)
        except ThetaUnavailable:
            self.skipTest("statsmodels too old for ThetaModel; skipping")
            return
        self._assertForecastDict(out, horizon=6, modelName="Theta")

    def testXgbForecastFormatOrSkip(self):
        xgboost = _tryImport("xgboost")
        if xgboost is None:
            self.skipTest("xgboost not installed; skipping XGB tests")

        from src.models.xgb import xgbForecast

        out = xgbForecast(self.series, horizon=6, nLags=12, searchIter=6, randomState=0)
        self._assertForecastDict(out, horizon=6, modelName="XGB")

    def testNbeatsForecastFormatOrSkip(self):
        neuralforecast = _tryImport("neuralforecast")
        if neuralforecast is None:
            self.skipTest("neuralforecast not installed; skipping N-BEATS tests")

        from src.models.nbeats import nbeatsForecast, NbeatsUnavailable

        pd = self.pd
        np = self.np
        longSeries = pd.Series(
            (np.sin(np.arange(40) / 6.0) * 10.0 + np.linspace(100.0, 130.0, 40)),
            index=pd.date_range("2020-01-01", periods=40, freq="MS"),
        )
        try:
            out = nbeatsForecast(longSeries, horizon=6, maxSteps=8, randomState=0)
        except NbeatsUnavailable:
            self.skipTest("neuralforecast dependencies unavailable")
            return
        self._assertForecastDict(out, horizon=6, modelName="N-BEATS")

    def testNbeatsRejectsShortSeries(self):
        from src.models.nbeats import nbeatsForecast

        pd = self.pd
        np = self.np
        shortSeries = pd.Series(
            np.linspace(100.0, 110.0, 24),
            index=pd.date_range("2020-01-01", periods=24, freq="MS"),
        )
        with self.assertRaises(ValueError) as ctx:
            nbeatsForecast(shortSeries, horizon=3)
        self.assertIn("36", str(ctx.exception))


class TestZForecastApiFlow(unittest.TestCase):
    """Class name uses Z_ so this suite runs after TestModelWrappers (N-BEATS/torch before XGB in same process)."""
    def setUp(self) -> None:
        from fastapi.testclient import TestClient
        from api.main import app

        self.client = TestClient(app)
        self.uploadsDir = Path(__file__).resolve().parent.parent / "uploads"
        self.uploadsDir.mkdir(exist_ok=True)

    def _postUploadCsv(self, csvBytes: bytes, filename: str = "data.csv") -> str:
        res = self.client.post(
            "/upload",
            files={"file": (filename, csvBytes, "text/csv")},
            headers={"Origin": "http://localhost:5173"},
        )
        self.assertEqual(res.status_code, 200, res.text)
        fileId = res.json()["file_id"]
        self.assertTrue(fileId)
        return fileId

    def _pollJob(self, jobId: str, *, timeoutSec: float = 30.0) -> dict:
        start = time.time()
        last = None
        while time.time() - start < timeoutSec:
            res = self.client.get(f"/status/{jobId}", headers={"Origin": "http://localhost:5173"})
            self.assertEqual(res.status_code, 200, res.text)
            body = res.json()
            last = body
            if body["status"] in ("done", "error"):
                return body
            time.sleep(0.05)
        self.fail(f"Job {jobId} did not finish in time; last={last}")

    def _runFlow(
        self,
        csvText: str,
        *,
        horizon: int,
        expectDone: bool = True,
        models=None,
    ) -> dict:
        fileId = self._postUploadCsv(csvText.encode("utf-8"), filename="dataset.csv")

        profileRes = self.client.get(f"/profile/{fileId}", headers={"Origin": "http://localhost:5173"})
        self.assertEqual(profileRes.status_code, 200, profileRes.text)

        validateRes = self.client.post(
            "/validate",
            json={"file_id": fileId, "date_col": "date", "metric_col": "metric", "group_col": None},
            headers={"Origin": "http://localhost:5173"},
        )
        self.assertEqual(validateRes.status_code, 200, validateRes.text)
        self.assertIn("valid", validateRes.json())

        if models is None:
            models = ["ETS", "THETA", "XGB"]
        forecastPayload = {
            "file_id": fileId,
            "date_col": "date",
            "metric_col": "metric",
            "group_col": None,
            "horizon": horizon,
            "models": models,
        }
        start = time.time()
        forecastRes = self.client.post("/forecast", json=forecastPayload, headers={"Origin": "http://localhost:5173"})
        elapsedMs = (time.time() - start) * 1000
        self.assertEqual(forecastRes.status_code, 200, forecastRes.text)
        self.assertLess(elapsedMs, 200.0 + 800.0)  # allow slack in CI
        jobId = forecastRes.json()["jobId"]

        statusBody = self._pollJob(jobId, timeoutSec=45.0)
        if expectDone:
            self.assertEqual(statusBody["status"], "done", statusBody)
            result = statusBody["result"]
            self.assertIn("history", result)
            self.assertIn("forecasts", result)
            self.assertIn("ensemble", result)
            self.assertTrue(len(result["forecasts"]) >= 1)
        return statusBody

    def testFullFlowWithCuratedDemoLikeData(self):
        rows = [
            "date,metric",
            "2022-01-01,102.0",
            "2022-02-01,108.8",
            "2022-03-01,117.1",
            "2022-04-01,123.0",
            "2022-05-01,124.3",
            "2022-06-01,121.6",
            "2022-07-01,116.4",
            "2022-08-01,112.7",
            "2022-09-01,113.2",
            "2022-10-01,118.9",
            "2022-11-01,128.3",
            "2022-12-01,138.5",
            "2023-01-01,113.2",
            "2023-02-01,120.1",
            "2023-03-01,129.0",
            "2023-04-01,135.2",
            "2023-05-01,137.1",
            "2023-06-01,134.7",
            "2023-07-01,185.0",
            "2023-08-01,126.1",
            "2023-09-01,126.8",
            "2023-10-01,133.3",
            "2023-11-01,143.2",
            "2023-12-01,154.0",
            "2024-01-01,125.7",
            "2024-02-01,133.0",
            "2024-03-01,142.2",
            "2024-04-01,148.8",
            "2024-05-01,151.1",
            "2024-06-01,149.0",
            "2024-07-01,144.0",
            "2024-08-01,140.7",
            "2024-09-01,141.7",
            "2024-10-01,148.7",
            "2024-11-01,159.0",
            "2024-12-01,170.2",
        ]
        self._runFlow("\n".join(rows), horizon=6, expectDone=True)

    def testShortSeriesUnder24MonthsDoesNotCrash(self):
        # 18 months — N-BEATS must skip (< 36) while ETS/Theta/XGB still run.
        rows = ["date,metric"]
        year = 2023
        month = 1
        value = 100.0
        for _ in range(18):
            rows.append(f"{year:04d}-{month:02d}-01,{value:.1f}")
            value += 2.0
            month += 1
            if month == 13:
                month = 1
                year += 1
        body = self._runFlow(
            "\n".join(rows),
            horizon=6,
            expectDone=True,
            models=["ETS", "THETA", "XGB", "N-BEATS"],
        )
        self.assertEqual(body["status"], "done", body)
        result = body["result"]
        self.assertIn("N-BEATS", result.get("failedModels", {}))
        self.assertNotIn("N-BEATS", result.get("forecasts", {}))

    def testMissingMonthsStillRuns(self):
        # 36-month span with some missing months (dropped)
        dates = [
            "2022-01-01",
            "2022-02-01",
            "2022-03-01",
            "2022-04-01",
            # missing 2022-05
            "2022-06-01",
            "2022-07-01",
            "2022-08-01",
            # missing 2022-09
            "2022-10-01",
            "2022-11-01",
            "2022-12-01",
            "2023-01-01",
            "2023-02-01",
            "2023-03-01",
            "2023-04-01",
            "2023-05-01",
            "2023-06-01",
            "2023-07-01",
            "2023-08-01",
            "2023-09-01",
            "2023-10-01",
            "2023-11-01",
            "2023-12-01",
            "2024-01-01",
            "2024-02-01",
            "2024-03-01",
            "2024-04-01",
            "2024-05-01",
            "2024-06-01",
            "2024-07-01",
            "2024-08-01",
            "2024-09-01",
            "2024-10-01",
            "2024-11-01",
            "2024-12-01",
        ]
        rows = ["date,metric"]
        for i, d in enumerate(dates):
            v = 120.0 + i * 1.8 + (8.0 if (i % 12) in (10, 11) else 0.0)
            rows.append(f"{d},{v:.1f}")
        self._runFlow("\n".join(rows), horizon=6, expectDone=True)

    def testModelFallbackOneFailureDoesNotCrashJob(self):
        # Force XGB to fail (len=13, nLags=12 => supervised has 1 row),
        # while ETS can still backtest with horizon=1 (train len=12).
        rows = ["date,metric"]
        year = 2023
        month = 1
        for i in range(13):
            rows.append(f"{year:04d}-{month:02d}-01,{100.0 + i:.1f}")
            month += 1
            if month == 13:
                month = 1
                year += 1

        fileId = self._postUploadCsv("\n".join(rows).encode("utf-8"))
        forecastPayload = {
            "file_id": fileId,
            "date_col": "date",
            "metric_col": "metric",
            "group_col": None,
            "horizon": 1,
            "models": ["ETS", "XGB"],
        }
        forecastRes = self.client.post("/forecast", json=forecastPayload)
        self.assertEqual(forecastRes.status_code, 200, forecastRes.text)
        jobId = forecastRes.json()["jobId"]
        statusBody = self._pollJob(jobId, timeoutSec=45.0)
        self.assertEqual(statusBody["status"], "done", statusBody)
        result = statusBody["result"]
        self.assertIn("forecasts", result)
        self.assertTrue("ETS" in result["forecasts"] or "XGB" in result["forecasts"])
        self.assertIn("failedModels", result)


if __name__ == "__main__":
    unittest.main()

