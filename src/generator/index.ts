import { TypeScriptGenerator } from './TypeScriptGenerator';
import { GolangGenerator } from './GolangGenerator';
import { GormGenerator } from './GormGenerator';
import { XormGenerator } from './XormGenerator';
import { AGenerator, GeneratorFactory } from './base';

GeneratorFactory.register('typescript', TypeScriptGenerator);
GeneratorFactory.register('go', GolangGenerator);
GeneratorFactory.register('gorm', GormGenerator);
GeneratorFactory.register('xorm', XormGenerator);

export { AGenerator, GeneratorFactory };
export type { Options } from './base';
export { TypeScriptGenerator, GolangGenerator, GormGenerator, XormGenerator };
