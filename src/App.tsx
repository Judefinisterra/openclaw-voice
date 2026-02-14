import AuthGate from './components/AuthGate';
import MainApp from './components/MainApp';

export default function App() {
  return (
    <AuthGate>
      {({ profiles, password, onLock }) => (
        <MainApp profiles={profiles} password={password} onLock={onLock} />
      )}
    </AuthGate>
  );
}
