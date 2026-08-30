import React from 'react';
import {
  ShieldCheck,
  Clock,
  Award,
  Users,
  Package,
  UserPlus,
  Scale,
  FileCheck,
} from 'lucide-react';
import ModernPortalLayout from '../../components/layout/ModernPortalLayout';

export default function CLMOPortal() {
  const menuSections = [
    {
      title: 'PAGES',
      items: [
        {
          label: 'Pre-Market Adjudication Queue',
          to: '/clmo',
          exact: true,
          icon: ShieldCheck,
          badge: null,
        },
        {
          label: 'Pending Review Applications',
          to: '/clmo/pending',
          exact: false,
          icon: Clock,
          badge: null,
        },
        {
          label: 'Clearance Certificate Vault',
          to: '/clmo/certificates',
          exact: false,
          icon: Award,
          badge: null,
        },
      ],
    },
    {
      title: 'STATUTORY CONTROLS',
      items: [
        {
          label: 'Subordinate ALMOs Directory',
          to: '/clmo/almos',
          exact: false,
          icon: Users,
          badge: 'L3',
        },
        {
          label: 'All Products Ledger',
          to: '/clmo/history',
          exact: false,
          icon: Package,
          badge: null,
        },
        {
          label: 'ALMO Verification & Commissioning',
          to: '/clmo/commissioning',
          exact: false,
          icon: ShieldCheck,
          badge: 'L3',
        },
      ],
    },
    {
      title: 'STATUTORY ONBOARDING',
      items: [
        {
          label: 'Register & Send to Commissioner',
          to: '/clmo/registration',
          exact: false,
          icon: UserPlus,
          badge: 'NEW CLMO',
        },
      ],
    },
  ];

  return (
    <ModernPortalLayout
      portalTitle="CLMO Adjudication Command"
      portalLevel="L2"
      levelName="Chief Legal Metrology Officer"
      menuSections={menuSections}
      demoTitle="Watch Adjudication Demo:"
      demoDescription="Explore how the Chief Legal Metrology Officer grants statutory pre-market packaging clearance under Section 36 and generates signed digital certificates."
    />
  );
}
