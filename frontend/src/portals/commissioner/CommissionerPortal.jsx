import React from 'react';
import {
  BarChart3,
  Users,
  Building2,
  ShieldAlert,
  BookOpen,
  Scale,
  Award,
} from 'lucide-react';
import ModernPortalLayout from '../../components/layout/ModernPortalLayout';

export default function CommissionerPortal() {
  const menuSections = [
    {
      title: 'PAGES',
      items: [
        {
          label: 'Statewide Compliance Dashboard',
          to: '/commissioner',
          exact: true,
          icon: BarChart3,
          badge: null,
        },
        {
          label: 'Subordinate CLMOs Directorate',
          to: '/commissioner/clmos',
          exact: false,
          icon: Users,
          badge: 'L2',
        },
        {
          label: 'Statewide ALMOs Network',
          to: '/commissioner/almos',
          exact: false,
          icon: Building2,
          badge: 'L3',
        },
      ],
    },
    {
      title: 'APEX STATUTORY CONTROLS',
      items: [
        {
          label: 'Certificate Revocation Vault',
          to: '/commissioner/revocations',
          exact: false,
          icon: ShieldAlert,
          badge: null,
        },
        {
          label: 'State Ruleset Matrix',
          to: '/commissioner/rulesets',
          exact: false,
          icon: BookOpen,
          badge: null,
        },
      ],
    },
  ];

  return (
    <ModernPortalLayout
      portalTitle="State Commissioner Apex Directorate"
      portalLevel="L1"
      levelName="State Commissioner / Director"
      menuSections={menuSections}
      demoTitle="Watch Directorate Overview:"
      demoDescription="Apex governance overview across all 5 lower statutory tiers, statewide audit quotas, warrant registries, and certificate revocation powers."
    />
  );
}
