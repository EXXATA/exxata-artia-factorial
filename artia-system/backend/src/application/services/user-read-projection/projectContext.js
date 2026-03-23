import { isSyntheticProjectNumber, normalizeText } from './shared.js';

export function extractProjectNumber(value) {
  const text = String(value || '').trim();
  if (!text) {
    return '';
  }

  if (text.includes(' - ')) {
    return text.split(' - ')[0].trim();
  }

  return text;
}

export function buildProjectCatalogContext(projectCatalog = []) {
  const byId = new Map();
  const byNumber = new Map();
  const byNormalizedLabel = new Map();

  projectCatalog.forEach((project) => {
    const normalizedNumber = normalizeText(project.number);
    const normalizedLabel = normalizeText(`${project.number || ''} ${project.name || ''}`);

    if (project.id) {
      byId.set(String(project.id), project);
    }

    if (normalizedNumber) {
      byNumber.set(normalizedNumber, project);
    }

    if (normalizedLabel) {
      byNormalizedLabel.set(normalizedLabel, project);
    }
  });

  return {
    list: projectCatalog,
    byId,
    byNumber,
    byNormalizedLabel
  };
}

export function buildCatalogProjectDescriptor(project) {
  return {
    key: String(project.id),
    id: String(project.id),
    number: String(project.number || '').trim(),
    name: String(project.name || '').trim(),
    label: `${project.number || ''}${project.name ? ` - ${project.name}` : ''}`.trim()
  };
}

export function resolveCatalogProjectDescriptor(projectContext, {
  systemProject = '',
  artiaProject = '',
  artiaProjectId = ''
} = {}) {
  const projectIdKey = artiaProjectId ? String(artiaProjectId).trim() : '';
  if (projectIdKey && projectContext.byId.has(projectIdKey)) {
    return buildCatalogProjectDescriptor(projectContext.byId.get(projectIdKey));
  }

  const normalizedSystemProject = normalizeText(extractProjectNumber(systemProject));
  if (normalizedSystemProject && projectContext.byNumber.has(normalizedSystemProject)) {
    return buildCatalogProjectDescriptor(projectContext.byNumber.get(normalizedSystemProject));
  }

  const normalizedArtiaProjectNumber = normalizeText(extractProjectNumber(artiaProject));
  if (normalizedArtiaProjectNumber && projectContext.byNumber.has(normalizedArtiaProjectNumber)) {
    return buildCatalogProjectDescriptor(projectContext.byNumber.get(normalizedArtiaProjectNumber));
  }

  const normalizedArtiaLabel = normalizeText(artiaProject);
  if (normalizedArtiaLabel && projectContext.byNormalizedLabel.has(normalizedArtiaLabel)) {
    return buildCatalogProjectDescriptor(projectContext.byNormalizedLabel.get(normalizedArtiaLabel));
  }

  return null;
}

export function resolveProjectDescriptor(projectContext, {
  systemProject = '',
  artiaProject = '',
  artiaProjectId = ''
} = {}) {
  const catalogDescriptor = resolveCatalogProjectDescriptor(projectContext, {
    systemProject,
    artiaProject,
    artiaProjectId
  });

  if (catalogDescriptor) {
    return catalogDescriptor;
  }

  const projectIdKey = artiaProjectId ? String(artiaProjectId).trim() : '';
  const rawNumber = extractProjectNumber(systemProject || artiaProject || projectIdKey);
  const rawName = String(artiaProject || systemProject || rawNumber || 'Sem projeto').trim();

  return {
    key: projectIdKey || normalizeText(rawNumber || rawName) || 'sem-projeto',
    id: projectIdKey || null,
    number: rawNumber || null,
    name: rawName || 'Sem projeto',
    label: rawNumber && rawName && rawName !== rawNumber ? `${rawNumber} - ${rawName}` : rawName || rawNumber || 'Sem projeto'
  };
}

export function buildProjectDisplayLabel(projectDescriptor, rawProject = '') {
  const descriptorNumber = String(projectDescriptor?.number || '').trim();
  const descriptorName = String(projectDescriptor?.name || '').trim();
  const rawLabel = String(rawProject || '').trim();

  if (rawLabel && (!descriptorNumber || isSyntheticProjectNumber(descriptorNumber))) {
    return rawLabel;
  }

  if (rawLabel) {
    const normalizedRawLabel = normalizeText(rawLabel);
    const normalizedDescriptorName = normalizeText(descriptorName);
    const normalizedComposite = normalizeText(`${descriptorNumber} ${descriptorName}`);

    if (normalizedRawLabel === normalizedComposite || normalizedRawLabel === normalizedDescriptorName) {
      return rawLabel;
    }
  }

  if (descriptorName) {
    if (!descriptorNumber || isSyntheticProjectNumber(descriptorNumber)) {
      return descriptorName;
    }

    if (normalizeText(descriptorName).startsWith(normalizeText(descriptorNumber))) {
      return descriptorName;
    }

    return `${descriptorNumber} - ${descriptorName}`;
  }

  if (descriptorNumber && !isSyntheticProjectNumber(descriptorNumber)) {
    return descriptorNumber;
  }

  return rawLabel || descriptorName || 'Sem projeto';
}
