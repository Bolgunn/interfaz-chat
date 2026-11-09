import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';
import 'katex/dist/katex.min.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { IdentityProvider } from './lib/identity';
import theme from './theme';

const client = new ApolloClient({
  uri: import.meta.env.VITE_GATEWAY_URI || '/graphql',
  cache: new InMemoryCache({
    typePolicies: {
      ServiceStatus: { keyFields: ['name'] },
      // Los IDs de opción son UUID, pero se guardan dentro de su encuesta.
      PollOption: { keyFields: false },
    },
  }),
  defaultOptions: {
    // Muestra los datos parciales aunque un servicio secundario falle.
    watchQuery: { errorPolicy: 'all', notifyOnNetworkStatusChange: false },
    query: { errorPolicy: 'all' },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ApolloProvider client={client}>
      <ChakraProvider theme={theme}>
        <IdentityProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </IdentityProvider>
      </ChakraProvider>
    </ApolloProvider>
  </StrictMode>,
);
