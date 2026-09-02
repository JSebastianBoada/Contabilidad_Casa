import { useState } from 'react'
import { Modal } from './Modal'
import {
  getActiveFirebaseConfig,
  saveFirebaseConfig,
  type FirebaseConfigOptions,
} from '../firebase/config'
import { useFinance } from '../context/FinanceContext'

interface FirebaseModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FirebaseModal({ isOpen, onClose }: FirebaseModalProps) {
  const { syncFirebase, showToast, isFirebaseActive } = useFinance()
  const activeConfig = getActiveFirebaseConfig()

  const [apiKey, setApiKey] = useState(activeConfig?.apiKey || '')
  const [projectId, setProjectId] = useState(activeConfig?.projectId || '')
  const [authDomain, setAuthDomain] = useState(activeConfig?.authDomain || '')
  const [storageBucket, setStorageBucket] = useState(activeConfig?.storageBucket || '')
  const [messagingSenderId, setMessagingSenderId] = useState(
    activeConfig?.messagingSenderId || ''
  )
  const [appId, setAppId] = useState(activeConfig?.appId || '')
  const [saving, setSaving] = useState(false)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1)

  const firestoreRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`

  function copyRules() {
    navigator.clipboard.writeText(firestoreRulesText)
    showToast('Reglas copiadas', 'Pégalas en la pestaña "Reglas" de Firestore')
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!apiKey || !projectId) {
      showToast('Campos requeridos', 'API Key y Project ID son obligatorios', 'warning')
      return
    }

    const newConfig: FirebaseConfigOptions = {
      apiKey: apiKey.trim(),
      projectId: projectId.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
      storageBucket: storageBucket.trim() || `${projectId.trim()}.appspot.com`,
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    }

    setSaving(true)
    try {
      saveFirebaseConfig(newConfig)
      await syncFirebase()
      showToast('Firebase Conectado', 'Tus finanzas ahora se sincronizan en la nube', 'success')
      onClose()
    } catch (err) {
      showToast(
        'Error al conectar',
        err instanceof Error ? err.message : 'Verifica las claves',
        'error'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Configuración de Firebase & Nube" maxWidth="640px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Status Indicator */}
        <div
          className={`banner ${isFirebaseActive ? 'success' : 'warning'}`}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div>
            <strong>Estado de Conexión: </strong>
            <span>
              {isFirebaseActive
                ? 'Conectado y sincronizando en tiempo real con Cloud Firestore'
                : 'Pendiente de credenciales de Firebase'}
            </span>
          </div>
          {isFirebaseActive && <span className="bullet active" />}
        </div>

        {/* Guía Paso a Paso */}
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
          <button
            type="button"
            className={`btn sm ${activeStep === 1 ? 'primary' : 'ghost'}`}
            onClick={() => setActiveStep(1)}
          >
            1. Crear Proyecto
          </button>
          <button
            type="button"
            className={`btn sm ${activeStep === 2 ? 'primary' : 'ghost'}`}
            onClick={() => setActiveStep(2)}
          >
            2. Activar Firestore & Reglas
          </button>
          <button
            type="button"
            className={`btn sm ${activeStep === 3 ? 'primary' : 'ghost'}`}
            onClick={() => setActiveStep(3)}
          >
            3. Ingresar Claves
          </button>
        </div>

        {activeStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--color-text-main)' }}>
            <p>
              1. Ingresa a la consola de Firebase:{' '}
              <a
                href="https://console.firebase.google.com/"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--color-primary-light)', fontWeight: 600, textDecoration: 'underline' }}
              >
                https://console.firebase.google.com/
              </a>
            </p>
            <p>
              2. Haz clic en <strong>"Crear un proyecto"</strong> (o "Add project") y nómbralo como prefieras (ej. <code>contabilidad-casa</code>).
            </p>
            <p>
              3. Desactiva o activa Google Analytics según tu preferencia y haz clic en <strong>Continuar</strong>.
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn secondary sm" onClick={() => setActiveStep(2)}>
                Siguiente: Activar Firestore →
              </button>
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
            <p>
              1. En el menú izquierdo de Firebase Console, ve a <strong>Compilación → Firestore Database</strong>.
            </p>
            <p>
              2. Haz clic en <strong>Crear base de datos</strong> y selecciona la ubicación más cercana (ej: <code>us-central1</code>).
            </p>
            <p>
              3. Ve a la pestaña <strong>Reglas (Rules)</strong> de Firestore, copia y pega estas reglas para permitir guardar tus datos:
            </p>
            <div style={{ position: 'relative' }}>
              <pre
                style={{
                  background: '#0f172a',
                  color: '#e2e8f0',
                  padding: '0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8rem',
                  overflowX: 'auto',
                }}
              >
                {firestoreRulesText}
              </pre>
              <button
                type="button"
                className="btn secondary sm"
                style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '0.75rem' }}
                onClick={copyRules}
              >
                Copiar Reglas
              </button>
            </div>
            <p>4. Haz clic en <strong>Publicar (Publish)</strong> en la consola.</p>
            <div style={{ marginTop: '0.5rem' }}>
              <button type="button" className="btn secondary sm" onClick={() => setActiveStep(3)}>
                Siguiente: Ingresar Claves →
              </button>
            </div>
          </div>
        )}

        {activeStep === 3 && (
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
              En Firebase Console, ve a <strong>Configuración del proyecto (Ícono de engranaje) → General → Tus apps → Web (&lt;/&gt;)</strong> y copia los datos del objeto <code>firebaseConfig</code>:
            </p>

            <div className="form-grid">
              <div className="form-group">
                <label>API Key *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Project ID *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="contabilidad-casa-123"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Auth Domain</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="contabilidad-casa.firebaseapp.com"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Storage Bucket</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="contabilidad-casa.appspot.com"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Messaging Sender ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="1234567890"
                  value={messagingSenderId}
                  onChange={(e) => setMessagingSenderId(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>App ID</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="1:123456789:web:abcdef"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn secondary" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn success" disabled={saving}>
                {saving ? 'Conectando...' : 'Guardar y Sincronizar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
