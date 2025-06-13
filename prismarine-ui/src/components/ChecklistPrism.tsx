import { useState } from 'react';
import { useNode } from '@craftjs/core';

export function ChecklistPrism({ label }: { label: string }) {
  const {
    connectors: { connect, drag },
  } = useNode();

  const [checked, setChecked] = useState(false);

  return (
    <label ref={ref => connect(drag(ref))} className="flex items-center space-x-2">
      <input type="checkbox" checked={checked} onChange={() => setChecked(!checked)} />
      <span>{label}</span>
    </label>
  );
}

