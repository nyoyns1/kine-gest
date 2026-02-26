import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Patient, Assessment } from '../../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export const exportEvaluationToPDF = (patient: Patient, assessment: Assessment, aiReport?: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setTextColor(14, 165, 233); // Sky-500
  doc.text('KinéGest Pro - Bilan Kinésithérapique', 20, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 20, 20, { align: 'right' });

  // Patient Info
  doc.setDrawColor(241, 245, 249);
  doc.line(20, 25, pageWidth - 20, 25);
  
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(`${patient.lastName} ${patient.firstName}`, 20, 35);
  
  doc.setFontSize(10);
  doc.text(`Né(e) le: ${patient.birthDate}`, 20, 42);
  doc.text(`Pathologie: ${patient.pathology}`, 20, 47);
  doc.text(`Type de Bilan: ${assessment.type}`, 20, 52);
  doc.text(`Date du Bilan: ${format(new Date(assessment.date), 'dd MMMM yyyy', { locale: fr })}`, 20, 57);

  // Pain Section
  doc.setFontSize(12);
  doc.setTextColor(14, 165, 233);
  doc.text('Évaluation de la Douleur', 20, 70);
  
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`EVA: ${assessment.pain.eva}/10`, 20, 77);
  doc.text(`Type: ${assessment.pain.type}`, 20, 82);
  doc.text(`Fréquence: ${assessment.pain.frequency}`, 20, 87);
  doc.text(`Localisation: ${assessment.pain.localisation.join(', ')}`, 20, 92);

  let lastY = 95;

  // Muscle Tests
  if (assessment.muscleTests.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(14, 165, 233);
    doc.text('Bilan Musculaire', 20, 105);
    
    autoTable(doc, {
      startY: 110,
      head: [['Muscle', 'Côté', 'Force (0-5)', 'Contracture']],
      body: assessment.muscleTests.map(m => [
        m.muscle,
        m.side,
        m.force,
        m.contracture ? 'Oui' : 'Non'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] },
      margin: { left: 20, right: 20 }
    });
    lastY = (doc as any).lastAutoTable.finalY;
  }

  // Joint Tests
  if (assessment.jointTests.length > 0) {
    const startY = lastY + 15;
    doc.setFontSize(12);
    doc.setTextColor(14, 165, 233);
    doc.text('Bilan Articulaire', 20, startY);
    
    autoTable(doc, {
      startY: startY + 5,
      head: [['Articulation', 'Mouvement', 'Valeur (°)', 'Qualité']],
      body: assessment.jointTests.map(j => [
        j.joint,
        j.movement,
        j.value,
        j.mobilityQuality || 'Normal'
      ]),
      theme: 'striped',
      headStyles: { fillColor: [14, 165, 233] },
      margin: { left: 20, right: 20 }
    });
  }

  // AI Report / Conclusion
  if (aiReport) {
    doc.addPage();
    doc.setFontSize(16);
    doc.setTextColor(14, 165, 233);
    doc.text('Analyse Clinique IA', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    const splitText = doc.splitTextToSize(aiReport, pageWidth - 40);
    doc.text(splitText, 20, 30);
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} sur ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
    doc.text('Document confidentiel - KinéGest Pro', 20, doc.internal.pageSize.getHeight() - 10);
  }

  doc.save(`Bilan_${assessment.type}_${patient.lastName}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};
