export interface Event {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  city: string;
  imageUrl: string;
  category: string;
}

export interface Ticket {
  id: string;
  eventId: string;
  event: Event;
  sector: string;
  row: string;
  seat: string;
  price: number;
  originalPrice?: number;
  sellerId: string;
  sellerName: string;
  status: "available" | "negotiating" | "sold";
  createdAt: string;
}

export interface Negotiation {
  id: string;
  ticketId: string;
  ticket: Ticket;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  status: "pending" | "accepted" | "rejected" | "completed";
  offerPrice: number;
  messages: NegotiationMessage[];
  createdAt: string;
}

export interface NegotiationMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export const CITIES = [
  "São Paulo",
  "Rio de Janeiro",
  "Belo Horizonte",
  "Curitiba",
  "Porto Alegre",
  "Salvador",
  "Brasília",
  "Recife",
  "Fortaleza",
];

export const CATEGORIES = [
  "Shows",
  "Esportes",
  "Teatro",
  "Festivais",
  "Stand-up",
  "Conferências",
];

export const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    name: "Rock in Rio 2025",
    date: "2025-09-12",
    time: "16:00",
    venue: "Parque Olímpico",
    city: "Rio de Janeiro",
    imageUrl: "",
    category: "Festivais",
  },
  {
    id: "2",
    name: "Flamengo x Palmeiras",
    date: "2025-08-20",
    time: "21:30",
    venue: "Maracanã",
    city: "Rio de Janeiro",
    imageUrl: "",
    category: "Esportes",
  },
  {
    id: "3",
    name: "Anitta - Ensaio da Anitta",
    date: "2025-07-15",
    time: "22:00",
    venue: "Allianz Parque",
    city: "São Paulo",
    imageUrl: "",
    category: "Shows",
  },
  {
    id: "4",
    name: "Lollapalooza Brasil 2025",
    date: "2025-03-28",
    time: "12:00",
    venue: "Autódromo de Interlagos",
    city: "São Paulo",
    imageUrl: "",
    category: "Festivais",
  },
  {
    id: "5",
    name: "Cirque du Soleil - Kooza",
    date: "2025-10-05",
    time: "20:00",
    venue: "Teatro Positivo",
    city: "Curitiba",
    imageUrl: "",
    category: "Teatro",
  },
  {
    id: "6",
    name: "Fábio Porchat - Novo Show",
    date: "2025-06-22",
    time: "21:00",
    venue: "Teatro Castro Alves",
    city: "Salvador",
    imageUrl: "",
    category: "Stand-up",
  },
];

export const MOCK_TICKETS: Ticket[] = [
  {
    id: "t1",
    eventId: "1",
    event: MOCK_EVENTS[0],
    sector: "Pista Premium",
    row: "-",
    seat: "Área livre",
    price: 890,
    originalPrice: 1200,
    sellerId: "u1",
    sellerName: "Lucas M.",
    status: "available",
    createdAt: "2025-03-01",
  },
  {
    id: "t2",
    eventId: "1",
    event: MOCK_EVENTS[0],
    sector: "Camarote",
    row: "A",
    seat: "12",
    price: 2500,
    sellerId: "u2",
    sellerName: "Ana C.",
    status: "available",
    createdAt: "2025-03-02",
  },
  {
    id: "t3",
    eventId: "2",
    event: MOCK_EVENTS[1],
    sector: "Arquibancada",
    row: "F",
    seat: "34",
    price: 180,
    originalPrice: 250,
    sellerId: "u3",
    sellerName: "Pedro R.",
    status: "available",
    createdAt: "2025-02-28",
  },
  {
    id: "t4",
    eventId: "3",
    event: MOCK_EVENTS[2],
    sector: "Pista",
    row: "-",
    seat: "Área livre",
    price: 350,
    sellerId: "u1",
    sellerName: "Lucas M.",
    status: "available",
    createdAt: "2025-03-05",
  },
  {
    id: "t5",
    eventId: "4",
    event: MOCK_EVENTS[3],
    sector: "Lolla Lounge",
    row: "-",
    seat: "Área VIP",
    price: 1800,
    originalPrice: 2200,
    sellerId: "u4",
    sellerName: "Mariana S.",
    status: "available",
    createdAt: "2025-03-03",
  },
  {
    id: "t6",
    eventId: "5",
    event: MOCK_EVENTS[4],
    sector: "Plateia A",
    row: "C",
    seat: "8",
    price: 420,
    sellerId: "u2",
    sellerName: "Ana C.",
    status: "available",
    createdAt: "2025-03-04",
  },
  {
    id: "t7",
    eventId: "6",
    event: MOCK_EVENTS[5],
    sector: "Plateia",
    row: "D",
    seat: "15",
    price: 120,
    originalPrice: 160,
    sellerId: "u3",
    sellerName: "Pedro R.",
    status: "available",
    createdAt: "2025-03-06",
  },
];

export const MOCK_NEGOTIATIONS: Negotiation[] = [
  {
    id: "n1",
    ticketId: "t1",
    ticket: MOCK_TICKETS[0],
    buyerId: "u5",
    buyerName: "Carlos F.",
    sellerId: "u1",
    sellerName: "Lucas M.",
    status: "pending",
    offerPrice: 800,
    messages: [
      {
        id: "m1",
        senderId: "u5",
        senderName: "Carlos F.",
        content: "Oi! Vi seu ingresso para o Rock in Rio. Aceita R$800?",
        createdAt: "2025-03-07T10:00:00",
      },
      {
        id: "m2",
        senderId: "u1",
        senderName: "Lucas M.",
        content: "Fala! O menor que consigo é R$850. Fecha?",
        createdAt: "2025-03-07T10:15:00",
      },
    ],
    createdAt: "2025-03-07",
  },
  {
    id: "n2",
    ticketId: "t3",
    ticket: MOCK_TICKETS[2],
    buyerId: "u5",
    buyerName: "Carlos F.",
    sellerId: "u3",
    sellerName: "Pedro R.",
    status: "accepted",
    offerPrice: 170,
    messages: [
      {
        id: "m3",
        senderId: "u5",
        senderName: "Carlos F.",
        content: "Aceita R$170 no ingresso do Fla x Palmeiras?",
        createdAt: "2025-03-06T14:00:00",
      },
      {
        id: "m4",
        senderId: "u3",
        senderName: "Pedro R.",
        content: "Fechado! Vamos combinar a entrega.",
        createdAt: "2025-03-06T14:30:00",
      },
    ],
    createdAt: "2025-03-06",
  },
];
