const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'public', 'icons', 'streamline');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.svg'));

console.log('Found', files.length, 'icons');

// Map filename to clean component name and metric key
const mapping = {
  'Target--Streamline-Lucide.svg': 'TargetIcon',
  'Settings--Streamline-Lucide.svg': 'SettingsIcon',
  'Rocket--Streamline-Lucide.svg': 'RocketIcon',
  'Lightbulb--Streamline-Lucide.svg': 'LightbulbIcon',
  'Users--Streamline-Lucide.svg': 'UsersIcon',
  'Wallet--Streamline-Lucide.svg': 'WalletIcon',
  'Sliders-Horizontal--Streamline-Lucide.svg': 'SlidersIcon',
  'Presentation--Streamline-Lucide.svg': 'PresentationIcon',
  'Crosshair--Streamline-Lucide.svg': 'CrosshairIcon',
  'Badge-Percent--Streamline-Lucide.svg': 'BadgePercentIcon',
  'Trophy--Streamline-Lucide.svg': 'TrophyIcon',
  'Lock--Streamline-Lucide.svg': 'LockIcon',
  'Lock-Open--Streamline-Lucide.svg': 'UnlockIcon',
  'Refresh-Cw--Streamline-Lucide.svg': 'RefreshIcon',
  'Download--Streamline-Lucide.svg': 'DownloadIcon',
  'Message-Square--Streamline-Lucide.svg': 'MessageSquareIcon',
  'Trash-2--Streamline-Lucide.svg': 'TrashIcon',
  'Check--Streamline-Lucide.svg': 'CheckIcon',
  'File-Text--Streamline-Lucide.svg': 'FileTextIcon',
  'Log-Out--Streamline-Lucide.svg': 'LogOutIcon'
};

const components = [];

for (const [file, compName] of Object.entries(mapping)) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.error('Missing:', file);
    continue;
  }
  const content = fs.readFileSync(filePath, 'utf8');
  // extract inner paths
  let inner = content
    .replace(/<svg[^>]*>/i, '')
    .replace(/<\/svg>/i, '')
    .replace(/<desc>[\s\S]*?<\/desc>/gi, '')
    .replace(/stroke="#000000"/gi, '')
    .replace(/stroke-width="1"/gi, 'strokeWidth="1.8"')
    .replace(/stroke-linecap="round"/gi, 'strokeLinecap="round"')
    .replace(/stroke-linejoin="round"/gi, 'strokeLinejoin="round"')
    .trim();

  components.push(`export function ${compName}({ size = 20, className = '', strokeWidth = 1.8, ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
      className={className}
      {...props}
    >
      ${inner}
    </svg>
  );
}`);
}

// Icon dictionary by key
const code = `'use client';
import React from 'react';

/**
 * Streamline Icons (Lucide Set via Streamline MCP)
 * Curated for EBC 2.0 Editorial Sharp Aesthetics
 */

${components.join('\n\n')}

export const STREAMLINE_ICONS = {
  market_need: TargetIcon,
  feasibility: SettingsIcon,
  potential_impact: RocketIcon,
  novelty: LightbulbIcon,
  team: UsersIcon,
  fund_utilization: WalletIcon,
  additional_params: SlidersIcon,
  presentation: PresentationIcon,
  target_audience: CrosshairIcon,
  pricing_strategy: BadgePercentIcon,
  competition_usp: TrophyIcon,
  lock: LockIcon,
  unlock: UnlockIcon,
  refresh: RefreshIcon,
  download: DownloadIcon,
  message: MessageSquareIcon,
  trash: TrashIcon,
  check: CheckIcon,
  fileText: FileTextIcon,
  logout: LogOutIcon,
  trophy: TrophyIcon
};

export function StreamlineIcon({ name, size = 20, className = '', strokeWidth = 1.8, ...props }) {
  const IconComp = STREAMLINE_ICONS[name];
  if (!IconComp) {
    return null;
  }
  return <IconComp size={size} className={className} strokeWidth={strokeWidth} {...props} />;
}

export default StreamlineIcon;
`;

const outDir = path.join(__dirname, '..', 'components', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
fs.writeFileSync(path.join(outDir, 'StreamlineIcons.js'), code, 'utf8');
console.log('Wrote StreamlineIcons.js successfully!');
