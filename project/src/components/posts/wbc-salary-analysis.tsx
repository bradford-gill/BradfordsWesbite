/* metadata: { "title": "Breaking Down the 2026 WBC by Salary", "date": "2026-03-18", "slug": "wbc-salary-analysis", "excerpt": "A look at the top four WBC teams by MLB salary" } */

import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Trophy, Users } from 'lucide-react';

interface Player {
  full_name: string;
  national_team: string;
  mlb_team: string;
  position: string;
  player_type: string;
  aav: number;
  contract_status: string;
  wbc_result: string;
  notes: string;
}

interface TeamSummary {
  team: string;
  totalAAV: number;
  players: number;
  mlbPlayers: number;
  avgAAV: number;
  wbcResult: string;
}

export default function WBCSalaryAnalysis() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/blog/wbc-salary-analysis/players.csv')
      .then(response => response.text())
      .then(csvText => {
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        const parsedPlayers = lines.slice(1).map(line => {
          const values = line.split(',');
          return {
            full_name: values[0],
            national_team: values[1],
            mlb_team: values[2],
            position: values[3],
            player_type: values[4],
            aav: parseInt(values[5]),
            contract_status: values[6],
            wbc_result: values[7],
            notes: values[8] || ''
          };
        });
        
        setPlayers(parsedPlayers);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading player data:', error);
        setLoading(false);
      });
  }, []);

  const getTeamSummaries = (): TeamSummary[] => {
    const teams = ['USA', 'Venezuela', 'Dominican Republic', 'Italy'];
    return teams.map(team => {
      const teamPlayers = players.filter(p => p.national_team === team);
      const mlbPlayers = teamPlayers.filter(p => p.aav > 0);
      const totalAAV = teamPlayers.reduce((sum, p) => sum + p.aav, 0);
      const avgAAV = mlbPlayers.length > 0 ? totalAAV / mlbPlayers.length : 0;
      
      return {
        team,
        totalAAV,
        players: teamPlayers.length,
        mlbPlayers: mlbPlayers.length,
        avgAAV,
        wbcResult: teamPlayers[0]?.wbc_result || ''
      };
    });
  };

  const getTopEarners = (limit: number = 15) => {
    return [...players]
      .sort((a, b) => b.aav - a.aav)
      .slice(0, limit);
  };

  const getContractStatusBreakdown = (team: string) => {
    const teamPlayers = players.filter(p => p.national_team === team);
    const statusCounts: { [key: string]: number } = {};
    
    teamPlayers.forEach(p => {
      statusCounts[p.contract_status] = (statusCounts[p.contract_status] || 0) + 1;
    });
    
    return statusCounts;
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const getTeamColor = (team: string) => {
    const colors: { [key: string]: string } = {
      'USA': 'bg-[#FF5722]',
      'Venezuela': 'bg-[#1B1B1B]',
      'Dominican Republic': 'bg-[#FF5722]',
      'Italy': 'bg-[#2E2E2E]'
    };
    return colors[team] || 'bg-[#1B1B1B]';
  };

  const getResultIcon = (result: string) => {
    if (result === 'Champion') return '🏆';
    if (result === 'Runner-Up') return '🥈';
    return '🏅';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-600">Loading player data...</div>
      </div>
    );
  }

  const teamSummaries = getTeamSummaries();
  const topEarners = getTopEarners();
  const totalAAV = teamSummaries.reduce((sum, t) => sum + t.totalAAV, 0);

  return (
    <div className="space-y-8">
      {/* Team Summary Stats */}
      <section>
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-[#1B1B1B] border-b-4 border-[#FF5722] pb-2 inline-block">
            The Four Rosters at a Glance
          </h3>
          <p className="text-sm text-[#2E2E2E] mt-3 font-medium">
            All salary figures shown as AAV (Average Annual Value)
          </p>
        </div>

        {/* Summary Table */}
        <div className="overflow-x-auto bg-white rounded-none border-4 border-[#1B1B1B] shadow-[8px_8px_0px_0px_rgba(27,27,27,1)]">
          <table className="w-full">
            <thead className="bg-[#F5F0EC] border-b-4 border-[#1B1B1B]">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#1B1B1B] uppercase tracking-wider">Team</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-[#1B1B1B] uppercase tracking-wider">Total AAV</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-[#1B1B1B] uppercase tracking-wider">Players</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-[#1B1B1B] uppercase tracking-wider">MLB Players</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-[#1B1B1B] uppercase tracking-wider">Avg AAV</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-[#1B1B1B] uppercase tracking-wider">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#1B1B1B]">
              {teamSummaries.map((summary) => (
                <tr key={summary.team} className="hover:bg-[#F5F0EC] transition-colors">
                  <td className="px-6 py-4 font-bold text-[#2E2E2E]">{summary.team}</td>
                  <td className="px-6 py-4 text-right font-bold text-[#FF5722]">{formatCurrency(summary.totalAAV)}</td>
                  <td className="px-6 py-4 text-right text-[#2E2E2E]">{summary.players}</td>
                  <td className="px-6 py-4 text-right text-[#2E2E2E]">{summary.mlbPlayers}</td>
                  <td className="px-6 py-4 text-right text-[#2E2E2E]">{formatCurrency(summary.avgAAV)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-none text-white text-xs font-bold border-2 border-[#1B1B1B] ${getTeamColor(summary.team)}`}>
                      {summary.wbcResult}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Deep Dive Analysis */}
      <section className="space-y-12">
        <h3 className="text-2xl font-bold text-[#1B1B1B] mb-6 border-b-4 border-[#FF5722] pb-2 inline-block">
          Deep Dive Analysis
        </h3>

        {/* Top Earners */}
        <div>
          <h4 className="font-bold text-[#1B1B1B] text-xl mb-4">Top 15 Highest-Paid Players</h4>
          <div className="max-h-[600px] overflow-y-auto border-4 border-[#1B1B1B] rounded-none bg-[#F5F0EC] p-4 shadow-[8px_8px_0px_0px_rgba(27,27,27,1)]">
            <div className="space-y-3">
              {topEarners.map((player, index) => (
                <div
                  key={index}
                  className="bg-white border-3 border-[#1B1B1B] rounded-none p-4 hover:shadow-[4px_4px_0px_0px_rgba(27,27,27,1)] transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl font-bold text-[#FF5722]">#{index + 1}</span>
                        <div>
                          <div className="font-bold text-[#1B1B1B]">{player.full_name}</div>
                          <div className="text-sm text-[#2E2E2E]">
                            {player.mlb_team} • {player.position}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#FF5722]">{formatCurrency(player.aav)}</div>
                      <div className={`inline-block px-3 py-1 rounded-none text-white text-xs font-bold mt-1 border-2 border-[#1B1B1B] ${getTeamColor(player.national_team)}`}>
                        {player.national_team}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contract Status Breakdown */}
        <div>
          <h4 className="font-bold text-[#1B1B1B] text-xl mb-4">Contract Status Breakdown</h4>
          <div className="space-y-6">
            {teamSummaries.map(summary => {
              const breakdown = getContractStatusBreakdown(summary.team);
              const total = Object.values(breakdown).reduce((sum, count) => sum + count, 0);

              return (
                <div key={summary.team} className="mb-6 bg-white border-4 border-[#1B1B1B] p-6 rounded-none shadow-[6px_6px_0px_0px_rgba(27,27,27,1)]">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="font-bold text-[#1B1B1B] text-lg">{summary.team}</h5>
                    <span className="text-sm font-bold text-[#2E2E2E] bg-[#F5F0EC] px-3 py-1 border-2 border-[#1B1B1B]">{total} players</span>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(breakdown).map(([status, count]) => {
                      const percentage = (count / total) * 100;
                      const statusColors: { [key: string]: string } = {
                        'Premium': 'bg-[#FF5722]',
                        'Mid-Range': 'bg-[#1B1B1B]',
                        'Arb/Early Extension': 'bg-[#2E2E2E]',
                        'Pre-Arb': 'bg-[#FF5722]',
                        'Non-MLB': 'bg-[#2E2E2E]'
                      };

                      return (
                        <div key={status} className="flex items-center gap-3">
                          <div className="w-40 text-sm font-bold text-[#2E2E2E]">{status}</div>
                          <div className="flex-1 bg-[#F5F0EC] rounded-none h-8 overflow-hidden border-2 border-[#1B1B1B]">
                            <div
                              className={`h-full ${statusColors[status]} flex items-center justify-end px-3 border-r-2 border-[#1B1B1B]`}
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-xs text-white font-bold">
                                {count}
                              </span>
                            </div>
                          </div>
                          <div className="w-16 text-sm font-bold text-[#2E2E2E] text-right">
                            {percentage.toFixed(0)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pre-Arb Stars */}
        <div>
          <h4 className="font-bold text-[#1B1B1B] text-xl mb-4">Pre-Arbitration Players ($770K)</h4>
          <div className="space-y-6">
            {teamSummaries.map(summary => {
              const preArbPlayers = players.filter(
                p => p.national_team === summary.team && p.contract_status === 'Pre-Arb'
              );

              if (preArbPlayers.length === 0) return null;

              return (
                <div key={summary.team} className="mb-6 bg-[#F5F0EC] rounded-none p-6 border-4 border-[#1B1B1B] shadow-[6px_6px_0px_0px_rgba(27,27,27,1)]">
                  <h5 className="font-bold text-[#1B1B1B] mb-4 text-lg">
                    {summary.team} ({preArbPlayers.length} pre-arb players)
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {preArbPlayers.map((player, idx) => (
                      <div key={idx} className="bg-white rounded-none p-3 border-2 border-[#1B1B1B] hover:shadow-[3px_3px_0px_0px_rgba(27,27,27,1)] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px]">
                        <div className="font-bold text-[#1B1B1B]">{player.full_name}</div>
                        <div className="text-sm text-[#2E2E2E]">
                          {player.mlb_team} • {player.position}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Italy Story */}
        <div>
          <h4 className="font-bold text-[#1B1B1B] text-xl mb-4">Italy's Roster ($47.9M Total AAV)</h4>
          <div className="bg-white rounded-none border-4 border-[#1B1B1B] p-6 shadow-[8px_8px_0px_0px_rgba(27,27,27,1)]">
            <h5 className="font-bold text-[#1B1B1B] mb-4 text-lg border-b-2 border-[#FF5722] pb-2 inline-block">Top 10 Players by AAV</h5>
            <div className="space-y-2">
              {players
                .filter(p => p.national_team === 'Italy')
                .sort((a, b) => b.aav - a.aav)
                .slice(0, 10)
                .map((player, idx) => (
                  <div key={idx} className="flex items-center justify-between py-3 border-b-2 border-[#F5F0EC] last:border-0 hover:bg-[#F5F0EC] transition-colors px-2">
                    <div>
                      <div className="font-bold text-[#1B1B1B] text-sm">{player.full_name}</div>
                      <div className="text-xs text-[#2E2E2E]">{player.mlb_team}</div>
                    </div>
                    <div className="font-bold text-[#FF5722] text-lg">{formatCurrency(player.aav)}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

