'use client'
import { AuthProvider } from '@/context/AuthProvider'
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react'
import { db } from '../firebase';
import { Team, UserInfo } from '@/lib/types';

function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>();
  const [team, setTeam] = useState<Team>();
  const [teamInfo, setTeamInfo] = useState<{
    points: number;
    names: string[];
  }>();

  useEffect(() => {
    getUser();
  }, []);
  useEffect(() => {
    async function getInfo() {
      try {
        await getUserInfo();
        await getTeam();
      }
      catch (error) {
        console.error(error);
      }
    }
    getInfo();
  }, [user]);
  useEffect(() => {
    parseTeamInfo();
  }, [team])

  async function getUser() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
  }

  async function getUserInfo() {
    if (user) {
      console.log("uid: ", user.uid)
      const docSnap = await getDoc(doc(db, "players", user.uid));
      if (docSnap.exists()) {
        setUserInfo(docSnap.data() as UserInfo);
      }
    }
  }

  async function getTeam() {

    const currentDate = new Date().getUTCDate();
    const docsSnap = await getDocs(query(collection(db, "teams"), where("date", '==', currentDate - 1))); /* This will be a single doc */ /* This also doesn't work if there isn't a teams doc already made for the given date */
    docsSnap.forEach((doc) => {
      if (user) {
        const teams: Team[] = doc.data().teams as Team[];
        for (const i in teams) {
          for (const j in teams[i].uuids) {
            if (teams[i].uuids[j] === user.uid) {
              setTeam(teams[i]);
              break;
            }
          }
        }
      }
    });
  }

  async function parseTeamInfo() {
    if (team) {
      const teamNames: string[] = [];
      for (let i = 0; i < team.uuids.length; i++) { // Typescript error here, potentially because the actual data comes from the awaited function above?
        const docSnap = await getDoc(doc(db, "players", team.uuids[i]));
        if (docSnap.exists()) {
          const data: UserInfo = docSnap.data() as UserInfo;
          teamNames.push(data.name);
        }
      }
      setTeamInfo({ points: team.points, names: teamNames });

    }
  }


  return (
    <AuthProvider>
      <div className='w-full min-h-[100vh]'>
        <div className='flex flex-col items-center w-full'>
          <h1 className='text-textlight font-semibold'>{team?.points}</h1>
          <p>Points Earned</p>
        </div>
        <p className='text-textlight'>
          {teamInfo?.names.map((index) => (
            <span key={index}>
              {index},&nbsp;
            </span>
          ))}

        </p>
      </div>
    </AuthProvider>
  )
}

export default Home