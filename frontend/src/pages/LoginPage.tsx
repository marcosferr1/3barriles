import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { Button, Card, CardSection, Input } from '../components/inline/Primitives';
import { toast } from '@/lib/toast';

const GREEN = '#1F3D2B';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Sesión iniciada');
      navigate('/app');
    } catch {
      // Credenciales inválidas: toast.error desde api/client.
    } finally {
      setLoading(false);
    }
  }

  const inputLight: React.CSSProperties = {
    background: '#FFFFFF',
    border: `1px solid rgba(31,61,43,0.22)`,
    color: GREEN,
  };

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: '#FFFFFF',
    color: GREEN,
  };

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ marginBottom: 22, textAlign: 'center' }}>
          <img
            src="/barriles-logo.png"
            alt="Barriles"
            style={{
              display: 'block',
              margin: '0 auto',
              maxWidth: 'min(100%, 340px)',
              height: 'auto',
            }}
          />
     
        </div>

        <Card
          style={{
            background: '#FFFFFF',
            border: '1px solid rgba(31,61,43,0.14)',
            boxShadow: '0 8px 32px rgba(31,61,43,0.08)',
            color: GREEN,
          }}
        >
          <CardSection style={{ padding: 18 }}>
            <div style={{ textAlign: 'center', marginBottom: 16, fontWeight: 800 }}>Iniciar sesión</div>
            <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="email" style={{ fontSize: 13, fontWeight: 650, opacity: 0.92 }}>
                  Email
                </label>
                <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="admin@3barriles.local" autoComplete="email" style={inputLight} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label htmlFor="password" style={{ fontSize: 13, fontWeight: 650, opacity: 0.92 }}>
                  Contraseña
                </label>
                <Input id="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" style={inputLight} />
              </div>
              <Button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 4,
                  background: GREEN,
                  color: '#F3F0E6',
                  borderColor: 'transparent',
                }}
              >
                {loading ? 'Ingresando…' : 'Entrar'}
              </Button>
            </form>
          </CardSection>
        </Card>

  
      </div>
    </div>
  );
}
