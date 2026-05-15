import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppProvider } from './provider'
import { AppRouter } from './router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient();

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <AppProvider>
      <AppRouter />
    </AppProvider>
    <ReactQueryDevtools initialIsOpen={false}/>
  </QueryClientProvider>
)
