import { PersonalizationService } from './PersonalizationService';
import { IPersonalizationService } from './IPersonalizationService';

let personalizationServiceInstance: IPersonalizationService | null = null;

export function getPersonalizationService(): IPersonalizationService {
    if (!personalizationServiceInstance) {
        personalizationServiceInstance = new PersonalizationService();
    }
    return personalizationServiceInstance;
}

export * from './IPersonalizationService';
export * from './PersonalizationService';
