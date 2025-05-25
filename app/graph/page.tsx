"use client";
import React, { useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { UserInfo } from "@/lib/types";

function Page() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    async function fetchUsersAndDrawChart() {
      // Fetch all users from Firestore
      const querySnapshot = await getDocs(collection(db, "players"));
      const users: UserInfo[] = [];
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserInfo);
      });

      // Prepare data for Chart.js
      const labels = users.map((user) => user.name);
      const data = users.map((user) => user.points);

      // Destroy previous chart instance if exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      Chart.defaults.color = "#ECF8F0";
      // Draw the chart
      if (chartRef.current) {
        chartInstance.current = new Chart(chartRef.current, {
          type: "bar",
          data: {
            labels,
            datasets: [
              {
                label: "Total Points",
                data,
                borderColor: [
                  "rgb(255, 99, 132)",
                  "rgb(255, 159, 64)",
                  "rgb(255, 205, 86)",
                  "rgb(75, 192, 192)",
                  "rgb(54, 162, 235)",
                  "rgb(153, 102, 255)",
                  "rgb(201, 203, 207)",
                  "rgb(100, 181, 246)",
                  "rgb(174, 234, 0)",
                ],
                borderWidth: 1,
                backgroundColor: [
                  "rgba(255, 99, 132, 0.2)",
                  "rgba(255, 159, 64, 0.2)",
                  "rgba(255, 205, 86, 0.2)",
                  "rgba(75, 192, 192, 0.2)",
                  "rgba(54, 162, 235, 0.2)",
                  "rgba(153, 102, 255, 0.2)",
                  "rgba(201, 203, 207, 0.2)",
                  "rgb(100, 181, 246, 0.2)",
                  "rgb(174, 234, 0, 0.2)",
                ],
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true },
              title: { display: true, text: "Gooner points" },
            },
            scales: {
              y: { beginAtZero: true },
            },
          },
        });
      }
    }

    fetchUsersAndDrawChart();
    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, []);

  return (
    <div className="px-8 py-4">
      <canvas ref={chartRef} />
    </div>
  );
}

export default Page;
