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
  date:
    | 1
    | 2
    | 3
    | 4
    | 5
    | 6
    | 7
    | 8
    | 9
    | 10
    | 11
    | 12
    | 13
    | 14
    | 15
    | 16
    | 17
    | 18
    | 19
    | 20
    | 21
    | 22
    | 23
    | 24
    | 25
    | 26
    | 27
    | 28
    | 29
    | 30
    | 31;
  teams: Team[];
};
