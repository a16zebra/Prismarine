import { useNode } from '@craftjs/core';

export function TextPrism({ text }: { text: string }) {
  const {
    connectors: { connect, drag },
  } = useNode();

  return (
    <p ref={ref => connect(drag(ref))} className="text-gray-800">
      {text}
    </p>
  );
}

