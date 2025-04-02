const ExcelProcessor = {
  processSheet(data) {
    try {
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      const locations = this.findHeaderLocations(worksheet);
      console.log("Localizações de cabeçalho encontradas:", locations);

      const horarios = this.extractTimes(worksheet, locations);

      return {
        horaInicio: horarios.inicio,
        horaTermino: horarios.termino,
        beneficios: this.getValueFromNextCell(
          worksheet,
          locations.beneficios,
          "beneficios"
        ),
        impactos: this.getValueFromNextCell(
          worksheet,
          locations.impactos,
          "default"
        ),
        areaAfetada: this.getValueFromNextCell(
          worksheet,
          locations.areaAfetada,
          "default"
        ),
        responsavel: this.getValueFromNextCell(
          worksheet,
          locations.responsavel,
          "responsavel"
        ),
      };
    } catch (error) {
      console.error("Erro ao processar planilha:", error);
      throw new Error("Falha ao processar planilha");
    }
  },

  findHeaderLocations(worksheet) {
    const headers = {
      horaInicio: ["início", "inicio"],
      horaTermino: ["término", "termino"],
      beneficios: ["escopo da manutenção:"],
      impactos: ["impactos", "impactos da manutenção"],
      areaAfetada: ["área afetada", "area afetada", "empresa afetada"],
      responsavel: ["responsável", "responsavel", "analista responsável"],
    };

    const locations = {};
    const range = XLSX.utils.decode_range(worksheet["!ref"]);

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const address = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[address];

        if (!cell || !cell.v) continue;

        const value = cell.v.toString().toLowerCase().trim();

        for (const [key, terms] of Object.entries(headers)) {
          if (!locations[key] && terms.some((term) => value.includes(term))) {
            locations[key] = { row, col, address };
            console.log(
              `Encontrado cabeçalho ${key} em ${address} com valor "${value}"`
            );
            break;
          }
        }
      }
    }

    return locations;
  },

  extractTimes(worksheet, locations) {
    const range = XLSX.utils.decode_range(worksheet["!ref"]);
    let horasInicio = [];
    let horasTermino = [];

    const isTimeValue = (value) => {
      return typeof value === "number" && value > 0 && value < 1;
    };

    if (locations.horaInicio) {
      for (let row = locations.horaInicio.row + 1; row <= range.e.r; row++) {
        const cell =
          worksheet[
            XLSX.utils.encode_cell({
              r: row,
              c: locations.horaInicio.col,
            })
          ];

        if (cell && isTimeValue(cell.v)) {
          horasInicio.push(cell.v);
          console.log(
            `Hora de início encontrada na linha ${row}:`,
            this.formatTime(cell.v)
          );
        }
      }
    }

    if (locations.horaTermino) {
      for (let row = locations.horaTermino.row + 1; row <= range.e.r; row++) {
        const cell =
          worksheet[
            XLSX.utils.encode_cell({
              r: row,
              c: locations.horaTermino.col,
            })
          ];

        if (cell && isTimeValue(cell.v)) {
          horasTermino.push(cell.v);
          console.log(
            `Hora de término encontrada na linha ${row}:`,
            this.formatTime(cell.v)
          );
        }
      }
    }

    let inicio = "";
    let termino = "";

    if (horasInicio.length > 0) {
      const menorHora = Math.min(...horasInicio);
      inicio = this.formatTime(menorHora);
      console.log("Menor hora de início:", inicio);
    }

    if (horasTermino.length > 0) {
      const maiorHora = Math.max(...horasTermino);
      termino = this.formatTime(maiorHora);
      console.log("Maior hora de término:", termino);
    }

    return { inicio, termino };
  },

  formatTime(value) {
    if (!value) return "";

    const totalHoras = value * 24;
    const horas = Math.floor(totalHoras);
    const minutos = Math.floor((totalHoras - horas) * 60);

    return `${horas.toString().padStart(2, "0")}:${minutos
      .toString()
      .padStart(2, "0")}`;
  },

  getValueFromNextCell(worksheet, location, type = "default") {
    if (!location) {
      console.log(`Nenhuma localização encontrada para ${type}`);
      return "";
    }

    const rightCell =
      worksheet[
        XLSX.utils.encode_cell({
          r: location.row,
          c: location.col + 1,
        })
      ];
    const bottomCell =
      worksheet[
        XLSX.utils.encode_cell({
          r: location.row + 1,
          c: location.col,
        })
      ];

    const rightValue = rightCell && rightCell.v ? rightCell.v.toString() : null;
    const bottomValue =
      bottomCell && bottomCell.v ? bottomCell.v.toString() : null;

    console.log(`Valor à direita de ${type}:`, rightValue);
    console.log(`Valor abaixo de ${type}:`, bottomValue);

    if (type === "responsavel") {
      return bottomValue || "";
    }

    return rightValue || bottomValue || "";
  },
};

export default ExcelProcessor;
