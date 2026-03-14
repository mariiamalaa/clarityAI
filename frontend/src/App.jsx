import { useState } from 'react'
import WizardStep1Upload from './components/WizardStep1Upload'
import './App.css'

const STEPS = ['Upload', 'Columns', 'Configure', 'Results']

function StepIndicator({ currentStep }) {
  return (
    <div className="stepIndicator">
      {STEPS.map((label, i) => (
        <div key={label} className="stepItem">
          <div className={`stepCircle ${i < currentStep ? 'done' : i === currentStep ? 'active' : ''}`}>
            {i < currentStep ? '✓' : i + 1}
          </div>
          <span className={`stepLabel ${i === currentStep ? 'active' : ''}`}>{label}</span>
          {i < STEPS.length - 1 && <div className={`stepLine ${i < currentStep ? 'done' : ''}`} />}
        </div>
      ))}
    </div>
  )
}

export default function App() {
  const [step, setStep] = useState(0)
  const [wizardState, setWizardState] = useState({
    fileId: null,
    filename: null,
    rows: null,
    columns: [],
    dateCol: null,
    metricCol: null,
    groupCol: null,
    horizon: 6,
    models: 'ensemble',
  })

  function updateWizard(updates) {
    setWizardState(prev => ({ ...prev, ...updates }))
  }

  function nextStep() {
    setStep(s => s + 1)
  }

  return (
    <div className="appShell">
      <header className="appHeader">
        <div className="logo">
          <span className="logoMark">◆</span>
          <span className="logoText">ClarityAI</span>
        </div>
        <span className="headerSub">Turn your data into decisions</span>
      </header>

      <main className="appMain">
        <StepIndicator currentStep={step} />

        <div className="wizardBody">
          {step === 0 && (
            <WizardStep1Upload
              onSuccess={(data) => {
                updateWizard({
                  fileId: data.file_id,
                  filename: data.filename,
                  rows: data.rows,
                  columns: data.columns,
                })
                nextStep()
              }}
            />
          )}
          {step === 1 && (
            <div className="placeholderStep">
              <p>Step 2 — Column confirmation (Issue #7)</p>
              <p className="placeholderSub">file_id: {wizardState.fileId}</p>
            </div>
          )}
          {step === 2 && (
            <div className="placeholderStep">
              <p>Step 3 — Forecast configuration (Issue #8)</p>
            </div>
          )}
          {step === 3 && (
            <div className="placeholderStep">
              <p>Results dashboard (Week 2)</p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
