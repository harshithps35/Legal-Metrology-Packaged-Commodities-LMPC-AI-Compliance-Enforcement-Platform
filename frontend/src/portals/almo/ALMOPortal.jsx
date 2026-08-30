import React from 'react';
import {
  ClipboardCheck,
  FileText,
  History,
  Users,
  Package,
  UserPlus,
  ShieldCheck,
  Building2,
  FileCheck,
} from 'lucide-react';
import ModernPortalLayout from '../../components/layout/ModernPortalLayout';

export default function ALMOPortal() {
  const menuSections = [
    {
      title: 'PAGES',
      items: [
        {
          label: 'VIR Evidence Verification',
          to: '/almo/reports',
          exact: false,
          icon: FileText,
          badge: null,
        },
        {
          label: 'Visit Orders History (VO)',
          to: '/almo/orders',
          exact: false,
          icon: History,
          badge: null,
        },
      ],
    },
    {
      title: 'STATUTORY CONTROLS',
      items: [
        {
          label: 'Subordinate Inspectors & Squads',
          to: '/almo/inspectors',
          exact: false,
          icon: Users,
          badge: 'L4/L5',
        },
        {
          label: 'All Products History',
          to: '/almo/history',
          exact: false,
          icon: Package,
          badge: null,
        },
      ],
    },
    {
      title: 'STATUTORY ONBOARDING',
      items: [
        {
          label: 'Register & Send to CLMO',
          to: '/almo/registration',
          exact: false,
          icon: UserPlus,
          badge: 'NEW ALMO',
        },
      ],
    },
  ];

  return (
    <ModernPortalLayout
      portalTitle="ALMO Sanctions Command"
      portalLevel="L3"
      levelName="Assistant Legal Metrology Officer"
      menuSections={menuSections}
      demoTitle="Watch Statutory Demo:"
      demoDescription="Learn how ALMO officers evaluate optical triage, issue Section 15 Field Visit Orders, and sign off on Sub-Inspector caliper audit reports."
    />
  );
}
