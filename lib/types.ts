export type Challenge = {
  author: string;
  challenge: string;
  challengeID: number;
  challengeType: "Negative" | "Daily" | "Normal" | null;
  completed: boolean;
  pointval: number;
  assignedPlayer: string | null;
};

export type UserInfo = {
  name: string;
  points: number;
};

export type Team = {
  points: number;
  uuids: string[];
};
export type TeamsDoc = {
  date: number;
  teams: Team[];
};
