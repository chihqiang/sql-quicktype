import { TypeScriptGenerator } from './typescript-generator';
import { GoGenerator } from './go-generator';
import { GormGenerator } from './gorm-generator';
import { XormGenerator } from './xorm-generator';
import { BaseGenerator, GeneratorFactory } from './base';

GeneratorFactory.register('typescript', TypeScriptGenerator);
GeneratorFactory.register('go', GoGenerator);
GeneratorFactory.register('gorm', GormGenerator);
GeneratorFactory.register('xorm', XormGenerator);

export { BaseGenerator, GeneratorFactory };
export type { Options } from './base';
export { TypeScriptGenerator, GoGenerator, GormGenerator, XormGenerator };
