/**
 * EVZA Gallery — Data Configuration
 * Escola Primária e Secundária Vale do Zambeze
 *
 * Each catalog represents a collection of photos and videos.
 * To add photos hosted on Google Drive:
 *   1. Set the file to "Anyone with the link can view"
 *   2. Extract the FILE_ID from the share URL
 *   3. Use driveLink(FILE_ID) for images, driveDownload(FILE_ID) for videos
 *   4. Or paste direct URLs if hosted elsewhere
 */

function driveLink(id) {
  return "https://drive.google.com/uc?export=view&id=" + id;
}

function driveDownload(id) {
  return "https://drive.google.com/uc?export=download&id=" + id;
}

const GALLERY_DATA = [
  {
    id: "formatura-2024",
    name: "Formatura 2024",
    description: "Cerimónia de formatura dos alunos do 12º ano — um marco inesquecível",
    cover: "",
    items: [
      {
        type: "photo",
        src: "",
        caption: "Panorama da cerimónia de formatura no pátio escolar"
      },
      {
        type: "photo",
        src: "",
        caption: "Entrega de certificados aos formandos"
      },
      {
        type: "photo",
        src: "",
        caption: "Momento de emoção — abraços entre familiares"
      },
      {
        type: "photo",
        src: "",
        caption: "Discurso do director da escola"
      },
      {
        type: "video",
        src: "",
        poster: "",
        caption: "Vídeo completo da cerimónia de formatura"
      },
      {
        type: "photo",
        src: "",
        caption: "Turma do 12º ano — foto oficial"
      }
    ]
  },
  {
    id: "dia-do-professor",
    name: "Dia do Professor",
    description: "Celebração do Dia do Professor na EVZA — homenagens e surpresas",
    cover: "",
    items: [
      {
        type: "photo",
        src: "",
        caption: "Professores recebem homenagens dos alunos"
      },
      {
        type: "photo",
        src: "",
        caption: "Atividades especiais na sala de aula"
      },
      {
        type: "photo",
        src: "",
        caption: "Foto de grupo — todos os professores da EVZA"
      }
    ]
  },
  {
    id: "visita-escolar",
    name: "Visita Escolar",
    description: "Excursão educativa ao Vale do Zambeze — aprendendo fora da sala de aula",
    cover: "",
    items: [
      {
        type: "photo",
        src: "",
        caption: "Paisagem deslumbrante do Rio Zambeze"
      },
      {
        type: "photo",
        src: "",
        caption: "Estudo de campo — recolha de amostras"
      },
      {
        type: "video",
        src: "",
        poster: "",
        caption: "Registo da caminhada pelo vale"
      },
      {
        type: "photo",
        src: "",
        caption: "Alunos no miradouro principal"
      }
    ]
  },
  {
    id: "dia-aberto",
    name: "Dia Aberto",
    description: "Portas abertas — comunidade convida a conhecer a escola",
    cover: "",
    items: [
      {
        type: "photo",
        src: "",
        caption: "Exposição de trabalhos científicos"
      },
      {
        type: "photo",
        src: "",
        caption: "Atividades desportivas para visitantes"
      },
      {
        type: "photo",
        src: "",
        caption: "Apresentação de dança do grupo cultural"
      }
    ]
  },
  {
    id: "atividades-desportivas",
    name: "Atividades Desportivas",
    description: "Torneio interescolar — futebol, atletismo e voleibol",
    cover: "",
    items: [
      {
        type: "photo",
        src: "",
        caption: "Final do torneio de futebol"
      },
      {
        type: "photo",
        src: "",
        caption: "Prova de atletismo — corrida de 100m"
      },
      {
        type: "photo",
        src: "",
        caption: "Torneio de voleibol feminino"
      },
      {
        type: "video",
        src: "",
        poster: "",
        caption: "Melhores momentos do dia desportivo"
      }
    ]
  },
  {
    id: "cultura-e-arte",
    name: "Cultura e Arte",
    description: "Festival cultural — dança, música e expressões artísticas",
    cover: "",
    items: [
      {
        type: "photo",
        src: "",
        caption: "Dança tradicional — grupo de makua"
      },
      {
        type: "photo",
        src: "",
        caption: "Exposição de pinturas dos alunos"
      },
      {
        type: "photo",
        src: "",
        caption: "Concerto de coros do primeiro ciclo"
      }
    ]
  }
];
