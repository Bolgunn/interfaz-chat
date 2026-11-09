import { Box } from '@chakra-ui/react';
import { useMemo } from 'react';

import { renderLatex } from '../lib/utils';

export default function Latex({ children, display = false, ...props }) {
  const html = useMemo(() => renderLatex(children || '', display), [children, display]);
  return (
    <Box as={display ? 'div' : 'span'} overflowX={display ? 'auto' : undefined}
      overflowY="hidden" maxW="full" {...props} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** Respuesta del bot de integrals: "<latex> = <resultado> + C ≈ <número>". */
export function IntegralReply({ content }) {
  if (content.startsWith('No pude') || content.startsWith('Uso:')) {
    return <Box whiteSpace="pre-wrap">{content}</Box>;
  }
  const [expr, numeric] = content.split(' ≈ ');
  return (
    <Box>
      <Latex display>{expr}</Latex>
      {numeric && <Box fontSize="sm" color="text.muted">≈ {numeric}</Box>}
    </Box>
  );
}
