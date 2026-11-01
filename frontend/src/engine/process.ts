/** Bounded connected leach/SX/EW reference; all flows have explicit units. */
export function conversion(age:number,reaction=2,diffusion=4){
 if(!Number.isFinite(age)||age<0||reaction<=0||diffusion<0)throw Error('Invalid kinetic domain');
 if(age>=reaction+diffusion)return 1;
 let lo=0,hi=1;for(let i=0;i<55;i++){const x=(lo+hi)/2;const time=reaction*(1-Math.cbrt(1-x))+diffusion*(1-3*(1-x)**(2/3)+2*(1-x));if(time<age)lo=x;else hi=x;}return (lo+hi)/2;
}
export function cstr(tau:number){if(!Number.isFinite(tau)||tau<=0)throw Error('Positive residence time required');const end=6,n=1024,dt=end/n;let sum=0;for(let i=0;i<=n;i++){const t=i*dt;sum+=(i===0||i===n?1:i%2?4:2)*conversion(t)*Math.exp(-t/tau)/tau;}return sum*dt/3+Math.exp(-end/tau);}
export function copperRoute(tau=6,currentKA=400,acid=700){
 if(![tau,currentKA,acid].every(Number.isFinite)||tau<.5||tau>20||currentKA<0||currentKA>1000||acid<0||acid>2000)throw Error('Outside reference route envelope');
 const feed=500,dissolved=Math.min(feed*cstr(tau),acid/1.543),raffinate=(dissolved/150)*(150/(150+2*120))**2;
 const transferred=dissolved-150*raffinate,faraday=currentKA*1000*3600*.92*.063546/(2*96485.33212),cathode=Math.min(transferred,faraday),power=currentKA*2.1;
 return {feed,dissolved,residue:feed-dissolved,transferred,raffinate,faraday,cathode,power,acidUsed:dissolved*1.543,specificEnergy:cathode>0?power/cathode:null,solutionLimited:cathode<faraday};
}
