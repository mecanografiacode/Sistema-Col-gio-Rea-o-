import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Equipment, EquipmentLoan, ServiceOrder, MaterialRequest } from '../types';

const tryDrawImage = (doc: jsPDF, urlStr: string | undefined, x: number, y: number, w: number, h: number) => {
  if (!urlStr) return;
  try {
    if (urlStr.startsWith('data:image/')) {
      const isPng = urlStr.includes('png');
      doc.addImage(urlStr, isPng ? 'PNG' : 'JPEG', x, y, w, h);
    }
  } catch (err) {
    console.warn('Não foi possível renderizar a imagem no PDF:', err);
  }
};

export const exportEquipmentsPDF = (equipments: Equipment[]) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;

  // Header Bar
  doc.setFillColor(211, 47, 47); // #D32F2F (Red Reação)
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COLÉGIO REAÇÃO — RECANTO DAS EMAS, DF', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CATÁLOGO E INVENTÁRIO DE EQUIPAMENTOS (COM FOTOS)', 14, 18);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Data de Emissão: ${formattedDate} | Total: ${equipments.length} equipamentos`, 14, 29);

  // Stats summary
  const ativos = equipments.filter((e) => e.status === 'ativo').length;
  const emprestados = equipments.filter((e) => e.status === 'emprestado').length;
  const manutencao = equipments.filter((e) => e.status === 'manutencao').length;
  const baixados = equipments.filter((e) => e.status === 'baixado').length;

  doc.setFont('helvetica', 'bold');
  doc.text(
    `Resumo: ${ativos} Ativos | ${emprestados} Emprestados | ${manutencao} Em Manutenção | ${baixados} Baixados`,
    150,
    29
  );

  // Table Data
  const tableRows = equipments.map((eq) => [
    '', // Photo space
    eq.asset_number || 'N/A',
    eq.name,
    eq.type || 'Geral',
    eq.room_location || 'Não informada',
    eq.acquisition_date ? new Date(eq.acquisition_date).toLocaleDateString('pt-BR') : 'N/A',
    eq.notes || '-',
    eq.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: 33,
    head: [['Foto', 'Nº Patrimônio', 'Nome do Equipamento', 'Tipo / Categoria', 'Local / Sala', 'Aquisição', 'Observações', 'Status']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      minCellHeight: 18,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 60 },
      3: { cellWidth: 32 },
      4: { cellWidth: 40 },
      5: { cellWidth: 24 },
      6: { cellWidth: 40 },
      7: { cellWidth: 25, fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const val = String(data.cell.raw).toLowerCase();
        if (val === 'ativo') {
          data.cell.styles.textColor = [16, 185, 129];
        } else if (val === 'emprestado') {
          data.cell.styles.textColor = [147, 51, 234];
        } else if (val === 'manutencao') {
          data.cell.styles.textColor = [217, 119, 6];
        } else if (val === 'baixado') {
          data.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const eq = equipments[data.row.index];
        if (eq && eq.foto_url) {
          const dim = 15;
          const x = data.cell.x + (data.cell.width - dim) / 2;
          const y = data.cell.y + (data.cell.height - dim) / 2;
          tryDrawImage(doc, eq.foto_url, x, y, dim, dim);
        }
      }
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Colégio Reação - Sistema de Gestão Interna - Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  doc.save(`Inventario_Equipamentos_Colegio_Reacao_${now.toISOString().split('T')[0]}.pdf`);
};

export const exportLoansPDF = (loans: EquipmentLoan[]) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;

  // Header
  doc.setFillColor(211, 47, 47); // #D32F2F
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COLÉGIO REAÇÃO — RECANTO DAS EMAS, DF', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RELATÓRIO DE EMPRÉSTIMOS E DEVOLUÇÕES DE EQUIPAMENTOS', 14, 18);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Data de Emissão: ${formattedDate} | Total Registros: ${loans.length}`, 14, 29);

  const pendentes = loans.filter((l) => l.status === 'em_aberto').length;
  const concluidos = loans.filter((l) => l.status === 'concluido').length;

  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${pendentes} Em Aberto | ${concluidos} Devolvidos`, 180, 29);

  // Table Data
  const tableRows = loans.map((loan) => [
    loan.equipment_name || 'Equipamento ID ' + loan.equipment_id,
    loan.funcionario_nome,
    loan.data_retirada ? new Date(loan.data_retirada).toLocaleString('pt-BR') : 'N/A',
    loan.data_devolucao ? new Date(loan.data_devolucao).toLocaleString('pt-BR') : 'Pendente',
    loan.observacao_retirada || loan.observacao_devolucao || '-',
    loan.status === 'em_aberto' ? 'EM ABERTO' : 'DEVOLVIDO'
  ]);

  autoTable(doc, {
    startY: 33,
    head: [['Equipamento', 'Responsável / Funcionário', 'Data Retirada', 'Data Devolução', 'Observações / Motivo', 'Status']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 35 },
      3: { cellWidth: 35 },
      4: { cellWidth: 50 },
      5: { cellWidth: 35, fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const val = String(data.cell.raw).toUpperCase();
        if (val === 'EM ABERTO') {
          data.cell.styles.textColor = [147, 51, 234];
        } else {
          data.cell.styles.textColor = [16, 185, 129];
        }
      }
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Colégio Reação - Sistema de Gestão Interna - Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  doc.save(`Emprestimos_Devolucoes_Colegio_Reacao_${now.toISOString().split('T')[0]}.pdf`);
};

export const exportServiceOrdersPDF = (orders: ServiceOrder[]) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const formattedDate = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`;

  // Header Bar
  doc.setFillColor(211, 47, 47); // #D32F2F (Red Reação)
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COLÉGIO REAÇÃO — RECANTO DAS EMAS, DF', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('RELATÓRIO DE ORDENS DE SERVIÇO DE MANUTENÇÃO (COM IMAGENS)', 14, 18);

  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text(`Data de Emissão: ${formattedDate} | Total de Ordens: ${orders.length}`, 14, 29);

  const concluidas = orders.filter((o) => o.status === 'concluida').length;
  const emAndamento = orders.filter((o) => o.status === 'em_andamento' || o.status === 'aberta').length;

  doc.setFont('helvetica', 'bold');
  doc.text(`Status: ${concluidas} Concluídas | ${emAndamento} Em Aberto/Andamento`, 170, 29);

  // Table Data
  const tableRows = orders.map((os) => [
    '', // Photo space
    `#${os.id}`,
    os.title,
    os.sector,
    os.priority.toUpperCase(),
    os.status.toUpperCase().replace('_', ' '),
    os.created_by_name || 'Usuário',
    os.assigned_to_name || 'Não atribuído',
    new Date(os.created_at).toLocaleDateString('pt-BR')
  ]);

  autoTable(doc, {
    startY: 33,
    head: [['Foto', 'ID', 'Título / Problema', 'Setor', 'Prioridade', 'Status', 'Solicitante', 'Técnico', 'Data']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      minCellHeight: 18,
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 20, halign: 'center' },
      1: { cellWidth: 18, fontStyle: 'bold' },
      2: { cellWidth: 65 },
      3: { cellWidth: 30 },
      4: { cellWidth: 24, fontStyle: 'bold' },
      5: { cellWidth: 28, fontStyle: 'bold' },
      6: { cellWidth: 32 },
      7: { cellWidth: 32 },
      8: { cellWidth: 20 }
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        if (data.column.index === 4) {
          const prio = String(data.cell.raw).toLowerCase();
          if (prio === 'urgente' || prio === 'alta') {
            data.cell.styles.textColor = [225, 29, 72];
          } else if (prio === 'media') {
            data.cell.styles.textColor = [217, 119, 6];
          }
        }
        if (data.column.index === 5) {
          const st = String(data.cell.raw).toLowerCase();
          if (st.includes('concluida')) {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (st.includes('andamento') || st.includes('aberta')) {
            data.cell.styles.textColor = [37, 99, 235];
          }
        }
      }
    },
    didDrawCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const os = orders[data.row.index];
        const photoUrl = os?.foto_abertura_url || os?.photo_url || os?.foto_conclusao_url;
        if (os && photoUrl) {
          const dim = 15;
          const x = data.cell.x + (data.cell.width - dim) / 2;
          const y = data.cell.y + (data.cell.height - dim) / 2;
          tryDrawImage(doc, photoUrl, x, y, dim, dim);
        }
      }
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Colégio Reação - Sistema de Gestão Interna - Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }

  doc.save(`Ordens_Servico_Colegio_Reacao_${now.toISOString().split('T')[0]}.pdf`);
};

export const exportMaterialRequestPDF = (req: MaterialRequest) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const now = new Date();
  const dateStr = req.request_date || new Date(req.created_at).toLocaleDateString('pt-BR');

  // Header Bar
  doc.setFillColor(211, 47, 47); // #D32F2F (Red Reação)
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('COLÉGIO REAÇÃO — RECANTO DAS EMAS, DF', 14, 12);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('REQUISIÇÃO DE MATERIAIS — COMPROVANTE DE SOLICITAÇÃO', 14, 18);

  // Protocol & Status Badge
  doc.setFillColor(241, 245, 249);
  doc.rect(14, 28, 182, 32, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, 28, 182, 32, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`PROTOCOLO #${req.id}`, 20, 36);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Título: ${req.title}`, 20, 42);

  doc.text(`Solicitante: ${req.requested_by_name}`, 20, 48);
  doc.text(`Turma / Setor: ${req.turma ? `${req.turma} (${req.sector})` : req.sector}`, 20, 54);

  doc.text(`Data do Pedido: ${dateStr}`, 120, 42);
  doc.text(`Urgência: ${req.urgency.toUpperCase()}`, 120, 48);
  doc.text(`Status: ${req.status.toUpperCase()}`, 120, 54);

  // Items Table
  const tableRows = req.items.map((item, index) => [
    (index + 1).toString(),
    item.name,
    item.quantity.toString(),
    item.unit
  ]);

  autoTable(doc, {
    startY: 64,
    head: [['#', 'Material / Item Solicitado', 'Quantidade', 'Unidade']],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [15, 23, 42]
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' },
      1: { cellWidth: 110 },
      2: { cellWidth: 30, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 30, halign: 'center' }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 10;

  // Justification Box
  if (req.justification) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('JUSTIFICATIVA DA SOLICITAÇÃO:', 14, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);

    const splitJustification = doc.splitTextToSize(req.justification, 180);
    doc.text(splitJustification, 14, currentY);
    currentY += splitJustification.length * 4.5 + 8;
  }

  // Signatures Area
  currentY = Math.max(currentY, 180);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('ASSINATURA E VALIDAÇÃO DOS RESPONSÁVEIS', 14, currentY);
  currentY += 6;

  // Solicitante Signature Box
  doc.setLineWidth(0.3);
  doc.setDrawColor(203, 213, 225);
  doc.rect(14, currentY, 86, 45, 'S');

  if (req.requester_signature_url) {
    tryDrawImage(doc, req.requester_signature_url, 20, currentY + 3, 74, 25);
  }
  doc.line(20, currentY + 33, 94, currentY + 33);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(req.requested_by_name || 'Solicitante', 20, currentY + 37);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Solicitante (${req.turma || req.sector}) - ${dateStr}`, 20, currentY + 41);

  // Director Signature Box
  doc.rect(110, currentY, 86, 45, 'S');

  if (req.director_signature_url) {
    tryDrawImage(doc, req.director_signature_url, 116, currentY + 3, 74, 25);
  }
  doc.line(116, currentY + 33, 190, currentY + 33);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(req.director_name || 'Diretora Geral / Direção', 116, currentY + 37);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    req.director_approval_date
      ? `Aprovado pela Direção em ${req.director_approval_date}`
      : 'Assinatura e Visto da Diretora',
    116,
    currentY + 41
  );

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Colégio Reação — Sistema de Gestão Interna — Documento gerado em ${now.toLocaleDateString('pt-BR')}`,
    14,
    285
  );

  doc.save(`Requisicao_Materiais_${req.id}_Colégio_Reacao.pdf`);
};
