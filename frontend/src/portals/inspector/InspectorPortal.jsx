import React from 'react';
import {
  Package,
  FileText,
  FileCheck,
  Shield,
  ShieldCheck,
  MapPin,
  ClipboardList,
  UserPlus,
} from 'lucide-react';
import ModernPortalLayout from '../../components/layout/ModernPortalLayout';

export default function InspectorPortal() {
  const menuSections = [
    {
      title: 'STATUTORY ENFORCEMENT',
      items: [
        {
          label: 'Pre-Market Triage & Severity Gate',
          to: '/inspector/pre-market',
          exact: false,
          icon: ShieldCheck,
          badge: 'Triage / Gate',
        },
        {
          label: 'Field Visits & VIR Verification',
          to: '/inspector/products',
          exact: true,
          icon: FileCheck,
          badge: 'VIR Review',
        },
        {
          label: 'Monthly Activity Ledger',
          to: '/inspector/ledger',
          exact: false,
          icon: FileText,
          badge: null,
        },
      ],
    },
    {
      title: 'STATUTORY ONBOARDING',
      items: [
        {
          label: 'Register & Send to ALMO',
          to: '/inspector/registration',
          exact: false,
          icon: UserPlus,
          badge: 'L4',
        },
      ],
    },
  ];

  return (
    <ModernPortalLayout
      portalTitle="Legal Metrology Enforcement Command"
      portalLevel="L4"
      levelName="Lead Legal Metrology Inspector (LMI)"
      menuSections={menuSections}
      demoTitle="Digital Desk Triage & Pre-Market Enforcement:"
      demoDescription="Automated LMPC optical OCR label verification, Schedule II font character height triage, digital clearance recommendations, and mandatory ALMO field visit sanction requests."
    />
  );
}
