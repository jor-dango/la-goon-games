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
  const [team, setTeam] = useState<{
    points: number;
    names: string[];
  }>();

  useEffect(() => {
    getUser();
  }, []);
  useEffect(() => {
    getInfo();
  }, [user]);

  async function getUser() {
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
  }

  // This function gets all the info from the DB needed to display info to the user
  async function getInfo() {
    try {
      await getUserInfo();
      await getTeamInfo();
    }
    catch (error) {
      console.error(error);
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

    async function getTeamInfo() {
      let yourTeam: Team | null = null;

      const currentDate = new Date().getUTCDate();
      const docsSnap = await getDocs(query(collection(db, "teams"), where("date", '==', currentDate))); // This will be a single doc
      docsSnap.forEach((doc) => {
        if (user) {
          const teams: Team[] = doc.data().teams as Team[];
          for (let i in teams) {
            for (let j in teams[i].uuids) {
              if (teams[i].uuids[j] === user.uid) {
                yourTeam = teams[i];
                break;
              }
            }
          }
        }
      });

      if (yourTeam !== null) {
        let teamNames: string[] = [];
        for (let i = 0; i < yourTeam.uuids.length; i++) { // Typescript error here, potentially because the actual data comes from the awaited function above?
          const docSnap = await getDoc(doc(db, "players", yourTeam.uuids[i]));
          if (docSnap.exists()) {
            const data: UserInfo = docSnap.data() as UserInfo;
            teamNames.push(data.name);
          }
        }
        setTeam({points: yourTeam.points, names: teamNames});
      }
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
          {team?.names.map((name) => (
            <span>
              {name},&nbsp;
            </span>
          ))}
          
        </p>
      </div>
    </AuthProvider>
  )
}

export default Home