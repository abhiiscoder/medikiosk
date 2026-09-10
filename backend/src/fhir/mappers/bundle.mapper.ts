/**
 * MEDiKIOSK Backend — Phase 10: Bundle FHIR Mapper
 * Packages individual mapped FHIR resources into a standard FHIR R4 collection Bundle.
 */

import { ICase } from '../../models/case.model.js';
import { FhirBundle, FhirResource } from '../types.js';

export function createFhirBundle(caseDoc: ICase, resources: FhirResource[]): FhirBundle {
  const timestamp = new Date().toISOString();

  return {
    resourceType: 'Bundle',
    id: `bundle-${caseDoc.caseId}`,
    type: 'collection',
    timestamp,
    total: resources.length,
    entry: resources.map((res) => ({
      fullUrl: `${res.resourceType}/${res.id}`,
      resource: res
    }))
  };
}
