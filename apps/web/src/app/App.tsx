import { QueryClientProvider } from '@tanstack/react-query';
import { PwaStatus } from '../features/pwa/PwaStatus';
import { I18nProvider } from '../i18n/I18nProvider';
import { queryClient } from './query';
import { useRoute } from './router';
import { ScreenOutlet } from './ScreenOutlet';
import { Shell } from './Shell';

function Routed() {
  const route = useRoute();
  return (
    <Shell route={route}>
      <ScreenOutlet route={route} />
    </Shell>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <Routed />
        <PwaStatus />
      </I18nProvider>
    </QueryClientProvider>
  );
}
