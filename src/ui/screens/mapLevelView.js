import { resolveAsset } from '../../st_bridge/asset.js';

function pickImage(node) {
  return node?.meta?.mapImage || node?.meta?.backgroundImage || node?.meta?.avatar || '';
}

function prettify(text = '') {
  return text
    .split('-')
    .filter(Boolean)
    .map((chunk) => chunk[0]?.toUpperCase() + chunk.slice(1))
    .join(' ');
}

function formatStatus(meta = {}) {
  const tags = [];

  if (meta.quarantineStatus && meta.quarantineStatus !== 'clear') {
    tags.push(`⚠ ${prettify(meta.quarantineStatus)}`);
  }

  if (meta.dangerLevel && !['low', 'moderate'].includes(meta.dangerLevel)) {
    tags.push(`☣ ${prettify(meta.dangerLevel)} risk`);
  }

  if (Array.isArray(meta.accessRestrictions) && meta.accessRestrictions.length > 0) {
    tags.push('⛔ Restricted');
  }

  if (meta.nightAccessAllowed === false) {
    tags.push('🌙 Night access blocked');
  }

  return tags.join(' · ');
}

function formatAvailability(availability) {
  if (!availability) return '';
  const phaseText = availability.timePhase ? `Now: ${prettify(availability.timePhase)}.` : '';

  if (!availability.available) {
    return `🚫 ${phaseText} ${availability.reason || 'Unavailable right now.'}`.trim();
  }
  if (availability.preferred) {
    return `🕯 ${phaseText} Preferred at this phase.`.trim();
  }
  return '';
}

function getLevelIntro(contextNode, config, nodes) {
  if (config?.level === 'city') {
    const districtCount = (nodes || []).length;
    return `Larkspur is split across ${districtCount} fractured districts. Choose a direction to move between the rebuilt core, old quarantine blocks, and the industrial edge.`;
  }

  if (config?.level === 'district') {
    return 'District access map. Locations listed below belong to this district and inherit its current restrictions.';
  }

  return contextNode?.meta?.description || '';
}



function renderActionList(actions = [], onActionClick = () => {}) {
  if (!Array.isArray(actions) || actions.length === 0) return null;

  const section = document.createElement('div');
  section.className = 'sillyrpg-action-list';

  const label = document.createElement('p');
  label.className = 'sillyrpg-location-copy';
  label.textContent = 'Available actions:';
  section.appendChild(label);

  for (const action of actions) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sillyrpg-btn sillyrpg-btn-block';
    button.textContent = action.label || action.id || 'Action';
    button.addEventListener('click', () => onActionClick(action));

    if (action.description) {
      const copy = document.createElement('p');
      copy.className = 'sillyrpg-location-copy';
      copy.textContent = action.description;
      section.append(button, copy);
      continue;
    }

    section.appendChild(button);
  }

  return section;
}
export function renderMapLevelView({ config, contextNode, nodes, onNodeClick, actions = [], phaseInfo = null }) {
  const wrap = document.createElement('div');
  wrap.className = 'sillyrpg-screen';

  const title = document.createElement('h3');
  title.className = 'sillyrpg-section-title';
  title.textContent = contextNode?.name || config?.displayName || 'Map';

  const subtitle = document.createElement('p');
  subtitle.className = 'sillyrpg-location-copy';
  subtitle.textContent = config?.level === 'city' ? 'Larkspur City Grid' : config?.level === 'district' ? 'District Route Layer' : config?.displayName || 'Navigation';

  const image = document.createElement('img');
  image.className = 'sillyrpg-image';
  image.alt = `${title.textContent} view`;
  image.src = resolveAsset(pickImage(contextNode));

  const description = document.createElement('p');
  description.className = 'sillyrpg-location-copy';
  description.textContent = getLevelIntro(contextNode, config, nodes);

  const phaseBanner = document.createElement('p');
  phaseBanner.className = 'sillyrpg-phase-context';
  phaseBanner.textContent = phaseInfo?.label
    ? `Current phase: ${phaseInfo.label}. ${phaseInfo.hint || ''}`
    : 'Current phase affects location and NPC availability.';

  const list = document.createElement('div');
  list.className = 'sillyrpg-card-grid';

  const hasContacts = (nodes || []).some((node) => node.type === 'npc');
  const listLabel = document.createElement('p');
  listLabel.className = 'sillyrpg-location-copy';
  listLabel.textContent = hasContacts
    ? 'Known contacts in this location (disabled entries are currently unavailable):'
    : 'Destinations (disabled entries are unavailable during this phase):';

  for (const node of nodes || []) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sillyrpg-btn sillyrpg-card';
    card.disabled = Boolean(node.availability && !node.availability.available);

    const name = document.createElement('span');
    name.className = 'sillyrpg-card-title';
    name.textContent = node.name;

    const nodeDescription = document.createElement('span');
    nodeDescription.className = 'sillyrpg-card-copy';
    nodeDescription.textContent = node?.meta?.description || 'No local notes yet.';

    card.append(name, nodeDescription);

    const status = formatStatus(node?.meta?.locationMeta);
    const availabilityStatus = formatAvailability(node?.availability);
    const fullStatus = [status, availabilityStatus].filter(Boolean).join(' · ');
    if (fullStatus) {
      const badge = document.createElement('span');
      badge.className = 'sillyrpg-card-status';
      badge.textContent = fullStatus;
      card.appendChild(badge);
    }

    card.addEventListener('click', () => onNodeClick(node));
    list.appendChild(card);
  }

  const actionList = renderActionList(actions, ({ id }) => onNodeClick({ type: 'action', id }));

  wrap.append(title, subtitle, image, description, phaseBanner, listLabel, list);
  if (actionList) wrap.appendChild(actionList);
  return wrap;
}
