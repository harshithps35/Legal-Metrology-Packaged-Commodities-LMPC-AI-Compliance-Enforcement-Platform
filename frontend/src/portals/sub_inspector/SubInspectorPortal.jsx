import React from 'react';
import {
  MapPin,
  ClipboardList,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Activity,
  UserPlus,
  Gavel,
  ShieldAlert,
} from 'lucide-react';
import ModernPortalLayout from '../../components/layout/ModernPortalLayout';

export default function SubInspectorPortal() {
  const menuSections = [
    {
      title: 'FIELD OPS & VISITS',
      items: [
        {
          label: 'Assigned On-Site Field Visits',
          to: '/sub-inspector/visits',
          exact: true,
          icon: MapPin,
          badge: 'GPS/Caliper',
        },
        {
          label: 'Product Violations Verification Desk',
          to: '/sub-inspector/violations',
          exact: false,
          icon: ShieldAlert,
          badge: 'Violations',
        },
      ],
    },
    {
      title: 'STATUTORY RESOLUTION',
      items: [
        {
          label: 'Statutory Resolution Desk',
          to: '/sub-inspector/resolution',
          exact: false,
          icon: Gavel,
          badge: '15-Day SLA',
        },
        {
          label: 'Audit & Product History',
          to: '/sub-inspector/history',
          exact: false,
          icon: FileText,
          badge: 'Ledger',
        },
      ],
    },
    {
      title: 'STATUTORY ONBOARDING',
      items: [
        {
          label: 'Register & Send to ALMO',
          to: '/sub-inspector/registration',
          exact: false,
          icon: UserPlus,
          badge: 'L5',
        },
      ],
    },
  ];

  return (
    <ModernPortalLayout
      portalTitle="Sub-Inspector & Field Squad Command"
      portalLevel="L5"
      levelName="Sub-Inspector & Resolution Desk"
      menuSections={menuSections}
      demoTitle="Watch Field Squad Demo:"
      demoDescription="Perform GPS check-ins, record physical Vernier caliper font measurements, capture timestamped artwork photos, and co-sign official VIRs."
    />
  );
}
