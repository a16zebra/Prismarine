import { Editor, Frame, Element } from '@craftjs/core';
import { Toolbox } from './components/Toolbox';
import { TextPrism } from './components/TextPrism';
import { ChecklistPrism } from './components/ChecklistPrism';

export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Prismarine UI Builder</h1>
      <Editor resolver={{ TextPrism, ChecklistPrism }}>
        <div className="flex gap-4">
          <Toolbox />
          <Frame>
            <Element is="div" canvas className="p-4 border rounded w-full min-h-[200px]">
              <TextPrism text="Drag components here" />
            </Element>
          </Frame>
        </div>
      </Editor>
    </div>
  );
}

