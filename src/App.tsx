import { useEffect, useState } from 'react';
import MainApp from './components/MainApp';
import OverlayApp from './components/OverlayApp';
import PinnedApp from './components/PinnedApp';
import DetailApp from './components/DetailApp';
import PunishModalApp from './components/PunishModalApp';
import BinderOverlayApp from './components/BinderOverlayApp';
import EventsOverlayApp from './components/EventsOverlayApp';
import OnlineOverlayApp from './components/OnlineOverlayApp';
import GameNotificationOverlay from './components/GameNotificationOverlay';

export default function App() {
  const [hash, setHash] = useState(window.location.hash);

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (hash === '#overlay' || hash === '#/overlay') return <OverlayApp />;
  if (hash === '#pinned' || hash === '#/pinned') return <PinnedApp />;
  if (hash === '#detail' || hash === '#/detail') return <DetailApp />;
  if (hash === '#punish' || hash === '#/punish') return <PunishModalApp />;
  if (hash === '#binder-overlay' || hash === '#/binder-overlay') return <BinderOverlayApp />;
if (hash === '#events-overlay' || hash === '#/events-overlay') return <EventsOverlayApp />;
  if (hash === '#online-overlay' || hash === '#/online-overlay') return <OnlineOverlayApp />;
  if (hash === '#notification-overlay' || hash === '#/notification-overlay') return <GameNotificationOverlay />;
  return <MainApp />;
}
