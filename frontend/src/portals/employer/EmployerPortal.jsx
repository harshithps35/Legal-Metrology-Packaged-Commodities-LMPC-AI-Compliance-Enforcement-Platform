import React from 'react';
import {
  BarChart3,
  Sparkles,
  FileCheck,
  AlertCircle,
  Package,
  Layers,
  Gavel,
  Scale,
} from 'lucide-react';
import ModernPortalLayout from '../../components/layout/ModernPortalLayout';

export default function EmployerPortal() {
  const menuSections = [
    {
      title: 'PAGES',
      items: [
        {
          label: 'Compliance Dashboard',
          to: '/employer/dashboard',
          exact: true,
          icon: BarChart3,
          badge: null,
        },
        {
          label: 'Artwork AI Scanner',
          to: '/employer/workbench',
          exact: false,
          icon: Sparkles,
          badge: 'OCR',
        },
        {
          label: 'Clearance Applications',
          to: '/employer/applications',
          exact: false,
          icon: FileCheck,
          badge: null,
        },
      ],
    },
    {
      title: 'RESOLUTION & COMPLIANCE',
      items: [
        {
          label: 'Product Violations & Rectifications',
          to: '/employer/notices',
          exact: false,
          icon: AlertCircle,
          badge: 'Violations',
        },
        {
          label: 'Statutory Resolution Desk',
          to: '/employer/resolution',
          exact: false,
          icon: Gavel,
          badge: '15-Day SLA',
        },
      ],
    },
  ];

  return (
    <ModernPortalLayout
      portalTitle="Brand Owner Packaging Suite"
      portalLevel="L6"
      levelName="Brand Owner / Manufacturer"
      menuSections={menuSections}
      demoTitle="Watch Compliance Demo:"
      demoDescription="Upload label artwork for automated LMPC rule check, submit pre-market clearance applications, and resolve 15-day deficiency notices."
    />
  );
}
