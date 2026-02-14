import AuthGate from './components/AuthGate';
import MainApp from './components/MainApp';

export default function App() {
  return (
    <AuthGate>
      {({ profiles, rooms, password, onLock }) => (
        <MainApp profiles={profiles} rooms={rooms} password={password} onLock={onLock} />
      )}
    </AuthGate>
  );
}
