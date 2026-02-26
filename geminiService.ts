
import { GoogleGenAI } from "@google/genai";
import { Patient, SessionNote, Assessment } from "./types";

export async function generateClinicalReport(patient: Patient, notes: SessionNote[], type: 'initial' | 'intermediaire' | 'final', assessments?: Assessment[]) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const notesContext = notes.map(n => `Date: ${n.date}, EVA: ${n.eva}, Note: ${n.content}`).join('\n');
  
  let assessmentContext = "";
  let imagePart = null;

  if (assessments && assessments.length > 0) {
    const lastAssessment = assessments[assessments.length - 1];
    assessmentContext = `
      Dernier Bilan Clinique (${lastAssessment.date}) :
      - Douleur (EVA): ${lastAssessment.pain.eva}/10
      - Type de douleur: ${lastAssessment.pain.type}
      - Fréquence: ${lastAssessment.pain.frequency}
      - Impact fonctionnel: ${lastAssessment.pain.impact}/10
      - Facteurs aggravants: ${lastAssessment.pain.aggravatingFactors}
      - Facteurs soulageants: ${lastAssessment.pain.relievingFactors}
      
      Tests Musculaires:
      ${lastAssessment.muscleTests.map(t => `- ${t.muscle} (${t.side}): ${t.force}/5`).join('\n')}
      
      Tests Articulaires:
      ${lastAssessment.jointTests.map(t => `- ${t.joint} (${t.side}): ${t.value}°`).join('\n')}
      
      Conclusion Fonctionnelle:
      - Autonomie: ${lastAssessment.functional.conclusion.autonomie}
      - Risque de chute: ${lastAssessment.functional.conclusion.risqueChute}
      - Score global: ${lastAssessment.functional.score}/100
    `;

    // Si une image de topographie existe, on peut l'envoyer au modèle (Gemini 3 Pro supporte les images)
    if (lastAssessment.pain.localisation && lastAssessment.pain.localisation[0] && lastAssessment.pain.localisation[0].startsWith('data:image')) {
      const base64Data = lastAssessment.pain.localisation[0].split(',')[1];
      imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: "image/png"
        }
      };
    }
  }
  
  const textPart = {
    text: `
      En tant que kinésithérapeute expert du cabinet "Re Form Center", génère un compte-rendu de bilan ${type} pour le patient suivant :
      Nom: ${patient.firstName} ${patient.lastName}
      Pathologie: ${patient.pathology}
      Antécédents: ${patient.antecedents.join(', ') || 'Aucun'}
      
      ${assessmentContext}

      Historique des dernières séances :
      ${notesContext}
      
      Le rapport doit être :
      1. Très structuré et professionnel.
      2. Prêt à être envoyé au médecin prescripteur (${patient.prescribingDoctor}).
      3. Inclus une analyse fine de la progression (douleur, mobilité, force).
      4. Analyse la topographie de la douleur si l'image est fournie.
      5. Propose des objectifs pour la suite et un plan de traitement futur.
      
      Formatte le texte uniquement en Markdown avec des titres clairs (##).
    `
  };

  try {
    const contents = imagePart ? { parts: [imagePart, textPart] } : { parts: [textPart] };
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents,
    });
    
    if (!response || !response.text) {
      throw new Error("La réponse du modèle est vide.");
    }
    
    return response.text;
  } catch (error: any) {
    console.error("Error generating report:", error);
    return "Désolé, une erreur technique est survenue lors de la génération du rapport par l'IA.";
  }
}
