// Daily Digest PDF Generator - Large Print Edition

/**
 * Generate a readable, large-print PDF from digest data
 * @param {Object} data - The digest data from the API
 */
function generateDigestPdf(data) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Colors
  const primaryColor = [37, 99, 235];
  const accentColor = [245, 158, 11];
  const darkGray = [31, 41, 55];
  const lightGray = [100, 100, 100];

  // ==================== HELPER FUNCTIONS ====================

  function setColor(color) {
    doc.setTextColor(color[0], color[1], color[2]);
  }

  function setDrawColor(color) {
    doc.setDrawColor(color[0], color[1], color[2]);
  }

  function setFillColor(color) {
    doc.setFillColor(color[0], color[1], color[2]);
  }

  function drawLine(x1, y1, x2, y2, width = 1) {
    doc.setLineWidth(width);
    doc.line(x1, y1, x2, y2);
  }

  function checkNewPage(needed = 100) {
    const bottomMargin = 50; // reserve space for footer
    if (y + needed > pageHeight - bottomMargin) {
      doc.addPage();
      y = margin;
      return true;
    }
    return false;
  }

  // ==================== PAGE 1: HEADER & WEATHER ====================

  function addPage1Header() {
    // Decorative top border
    setFillColor(accentColor);
    doc.rect(0, 0, pageWidth, 10, 'F');

    y = 35;

    // Greeting
    const hour = new Date().getHours();
    let greeting = 'Good Morning!';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon!';
    if (hour >= 17) greeting = 'Good Evening!';

    setColor(primaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(48);
    doc.text(greeting, pageWidth / 2, y + 35, { align: 'center' });

    // Decorative line
    y += 55;
    setDrawColor(accentColor);
    drawLine(pageWidth / 2 - 120, y, pageWidth / 2 + 120, y, 4);

    // Date - LARGE
    y += 30;
    setColor(darkGray);
    doc.setFont('times', 'normal');
    doc.setFontSize(22);
    doc.text(data.date, pageWidth / 2, y, { align: 'center' });

    // Location - LARGE
    y += 28;
    const location = data.location.state
      ? `${data.location.city}, ${data.location.state}`
      : data.location.city;
    doc.setFontSize(20);
    doc.text(location, pageWidth / 2, y, { align: 'center' });

    // Divider
    y += 25;
    setDrawColor(darkGray);
    drawLine(margin, y, pageWidth - margin, y, 2);
    y += 25;
  }

  function addWeatherSection() {
    // Section title
    setColor(primaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text('Weather', margin, y);
    y += 30;

    const weather = data.weather;
    const colWidth = contentWidth / 4;

    const days = [
      { label: 'Today', data: weather.current },
      ...weather.forecast.map(d => ({
        label: formatDayName(d.date),
        data: d
      }))
    ];

    const startY = y;

    days.forEach((day, i) => {
      const x = margin + (i * colWidth);
      const boxWidth = colWidth - 8;
      const centerX = x + boxWidth / 2;

      // Day name - LARGE
      setColor(i === 0 ? primaryColor : darkGray);
      doc.setFont('times', 'bold');
      doc.setFontSize(18);
      doc.text(day.label, centerX, startY, { align: 'center' });

      // Temperature - VERY LARGE
      doc.setFontSize(36);
      setColor(darkGray);
      doc.text(`${day.data.temp}°`, centerX, startY + 40, { align: 'center' });

      // High/Low - MEDIUM
      doc.setFont('times', 'normal');
      doc.setFontSize(14);
      setColor(lightGray);
      doc.text(`${day.data.tempHigh}° / ${day.data.tempLow}°`, centerX, startY + 58, { align: 'center' });

      // Description - MEDIUM
      doc.setFontSize(13);
      const desc = capitalizeFirst(day.data.description);
      doc.text(desc, centerX, startY + 75, { align: 'center' });
    });

    y = startY + 95;

    // Simple divider
    setDrawColor([200, 200, 200]);
    drawLine(margin, y, pageWidth - margin, y, 1);
    y += 25;
  }

  // ==================== NEWS SECTION ====================

  function addNewsSection() {
    checkNewPage(150);

    setColor(primaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text("Today's Good News", margin, y);
    y += 30;

    data.news.forEach((item, i) => {
      // Pre-calculate actual height needed for this item
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      const headlineLines = doc.splitTextToSize(item.title, contentWidth);
      let itemHeight = headlineLines.length * 20;

      let descLines = [];
      if (item.description) {
        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        descLines = doc.splitTextToSize(item.description, contentWidth);
        itemHeight += descLines.length * 18;
      }
      itemHeight += 15;

      checkNewPage(itemHeight);

      // Headline - LARGE
      doc.setFont('times', 'bold');
      doc.setFontSize(16);
      setColor(darkGray);
      doc.text(headlineLines, margin, y);
      y += headlineLines.length * 20;

      // Description - MEDIUM (full text, no truncation)
      if (descLines.length > 0) {
        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        setColor(lightGray);
        doc.text(descLines, margin, y);
        y += descLines.length * 18;
      }

      y += 15;
    });

    y += 10;
  }

  // ==================== CALENDAR SECTION ====================

  function addCalendarSection() {
    checkNewPage(200);

    // Holidays section
    setColor(primaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text('Upcoming Dates', margin, y);
    y += 30;

    if (data.holidays && data.holidays.length > 0) {
      data.holidays.slice(0, 8).forEach(item => {
        checkNewPage(30);

        doc.setFont('times', 'bold');
        doc.setFontSize(15);
        setColor(darkGray);
        doc.text(item.name, margin, y);

        doc.setFont('times', 'normal');
        setColor(lightGray);
        const dateStr = formatEventDate(item.date);
        doc.text(dateStr, pageWidth - margin, y, { align: 'right' });
        y += 22;
      });
    }

    y += 20;

    // This Day in History
    checkNewPage(150);

    setColor(primaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(24);
    doc.text('This Day in History', margin, y);
    y += 30;

    if (data.history && data.history.length > 0) {
      data.history.forEach(item => {
        // Pre-calculate actual height needed
        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        const eventLines = doc.splitTextToSize(item.event, contentWidth - 50);
        const itemHeight = eventLines.length * 18 + 12;

        checkNewPage(itemHeight);

        // Year - bold accent color
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        setColor(accentColor);
        doc.text(item.year + ':', margin, y);

        // Event text - wrap properly
        doc.setFont('times', 'normal');
        doc.setFontSize(14);
        setColor(darkGray);
        doc.text(eventLines, margin + 50, y);
        y += eventLines.length * 18 + 12;
      });
    }
  }

  // ==================== CROSSWORD PAGE ====================

  function addCrosswordPage() {
    doc.addPage();
    y = margin;

    // Header
    setFillColor(accentColor);
    doc.rect(0, 0, pageWidth, 8, 'F');

    y = 30;
    setColor(primaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(32);
    doc.text('Crossword Puzzle', pageWidth / 2, y, { align: 'center' });

    y += 15;
    setDrawColor(accentColor);
    drawLine(pageWidth / 2 - 100, y, pageWidth / 2 + 100, y, 3);
    y += 25;

    // Generate crossword
    const crossword = window.CrosswordGenerator.generate(data.crosswordWords, 12, data.customClues || {});
    const displayGrid = window.CrosswordGenerator.createDisplayGrid(
      crossword.grid,
      crossword.words,
      crossword.size
    );

    // Draw grid - LARGER cells
    const gridSize = crossword.size;
    const cellSize = 30;
    const gridWidth = gridSize * cellSize;
    const gridStartX = (pageWidth - gridWidth) / 2;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const cell = displayGrid[row][col];
        const x = gridStartX + (col * cellSize);
        const cellY = y + (row * cellSize);

        if (cell.isEmpty) {
          setFillColor(darkGray);
          doc.rect(x, cellY, cellSize, cellSize, 'F');
        } else {
          setDrawColor(darkGray);
          doc.setLineWidth(1);
          doc.rect(x, cellY, cellSize, cellSize, 'S');

          if (cell.number) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            setColor(primaryColor);
            doc.text(String(cell.number), x + 2, cellY + 9);
          }
        }
      }
    }

    y += (gridSize * cellSize) + 30;

    // Clues - LARGER text
    const cluesStartY = y;
    const clueColWidth = contentWidth / 2 - 20;

    // ACROSS
    setColor(primaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.text('ACROSS', margin, y);
    y += 22;

    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    setColor(darkGray);

    crossword.words.across.forEach(word => {
      const clueText = `${word.number}. ${word.clue}`;
      const lines = doc.splitTextToSize(clueText, clueColWidth);
      doc.text(lines, margin, y);
      y += lines.length * 16 + 4;
    });

    // DOWN
    y = cluesStartY;
    const downX = pageWidth / 2 + 10;

    setColor(primaryColor);
    doc.setFont('times', 'bold');
    doc.setFontSize(18);
    doc.text('DOWN', downX, y);
    y += 22;

    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    setColor(darkGray);

    crossword.words.down.forEach(word => {
      const clueText = `${word.number}. ${word.clue}`;
      const lines = doc.splitTextToSize(clueText, clueColWidth);
      doc.text(lines, downX, y);
      y += lines.length * 16 + 4;
    });

    // Upside-down answers at bottom
    addUpsideDownAnswers(crossword);
  }

  function addUpsideDownAnswers(crossword) {
    const answerY = pageHeight - 45;

    // Separator line
    setDrawColor([180, 180, 180]);
    drawLine(margin + 30, answerY - 20, pageWidth - margin - 30, answerY - 20, 0.5);

    // Build answer strings
    const acrossAnswers = crossword.words.across.map(w => `${w.number}-${w.word}`).join('  ');
    const downAnswers = crossword.words.down.map(w => `${w.number}-${w.word}`).join('  ');

    // To render upside-down, we rotate the text 180 degrees
    doc.setFont('times', 'normal');
    doc.setFontSize(8);
    setColor(lightGray);

    // Save state, translate to position, rotate 180, draw, restore
    const centerX = pageWidth / 2;

    // Draw upside down by using transformation matrix
    // Rotate 180 degrees = scale(-1, -1) and translate
    doc.saveGraphicsState();

    // Move origin to where we want the text, rotate 180, then draw at 0,0
    const text1 = `Answers - Across: ${acrossAnswers}`;
    const text2 = `Down: ${downAnswers}`;

    // For true 180° rotation (upside down, not mirrored):
    // We need to transform: translate to point, scale(-1,-1), draw
    doc.internal.write('q'); // save graphics state

    // Transform: move to center, flip both axes (180° rotation), move back
    doc.internal.write(`-1 0 0 -1 ${pageWidth} ${pageHeight} cm`);

    // Now coordinates are flipped - draw at the "flipped" position
    const flippedY = pageHeight - answerY + 5;
    doc.text(text1, centerX, flippedY, { align: 'center' });
    doc.text(text2, centerX, flippedY + 10, { align: 'center' });

    doc.internal.write('Q'); // restore graphics state
  }

  function addFooter() {
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    setColor(lightGray);
    doc.text(
      'Daily Digest',
      pageWidth / 2,
      pageHeight - 15,
      { align: 'center' }
    );
  }

  // ==================== UTILITIES ====================

  function formatDayName(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  function formatEventDate(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }

  function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ==================== BUILD PDF ====================

  addPage1Header();
  addWeatherSection();
  addNewsSection();
  addCalendarSection();
  addCrosswordPage();

  // Add footers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter();
  }

  // Save
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  const citySlug = data.location.city.toLowerCase().replace(/\s+/g, '-');
  doc.save(`daily-digest-${citySlug}-${dateStr}.pdf`);
}

window.generateDigestPdf = generateDigestPdf;
