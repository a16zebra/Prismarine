import { useEditor } from '@craftjs/core';
import { TextPrism } from './TextPrism';
import { ChecklistPrism } from './ChecklistPrism';

export function Toolbox() {
  const { connectors } = useEditor();

  return (
    <div className="space-y-4 p-2 border rounded">
      <div ref={ref => connectors.create(ref, <TextPrism text="New Text" />)} className="cursor-move p-2 bg-gray-100 rounded">
        Text Prism
      </div>
      <div ref={ref => connectors.create(ref, <ChecklistPrism label="New Task" />)} className="cursor-move p-2 bg-gray-100 rounded">
        Checklist Prism
      </div>
    </div>
  );
}
