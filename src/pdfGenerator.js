import PDFDocument from 'pdfkit';
import fs from 'fs';

export class PDFGenerator {
  generateTemplate(key, outputPath) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Ajouter le titre
      doc.fontSize(20).text('Modèle de Clé', { align: 'center' });
      
      // Ajouter les informations de la clé
      doc.moveDown();
      doc.fontSize(12);
      doc.text(`Nom de la Clé: ${key.name}`);
      doc.text(`Créée le: ${new Date(key.created_at).toLocaleDateString('fr-FR')}`);
      
      // Ajouter les guides d'alignement
      doc.moveDown();
      doc.rect(100, 300, 400, 200).stroke();
      doc.text('Placer la clé ici', 250, 400);
      
      // Ajouter les métadonnées
      doc.moveDown(2);
      doc.text('Métadonnées:', { underline: true });
      const metadata = JSON.parse(key.metadata);
      Object.entries(metadata).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`);
      });

      doc.end();

      stream.on('finish', () => resolve(outputPath));
      stream.on('error', reject);
    });
  }
}