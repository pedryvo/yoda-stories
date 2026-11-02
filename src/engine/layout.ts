/** Native map codes and layout routines recovered from Yodesk.exe.
 * 004201f0 grows rings, 00422210 grows edge cells, 00420c00 builds islands,
 * 00404cb0 assigns quest order. No catalog-zone selection happens here.
 */
export enum LayoutType {
  None=0, Empty=1, TravelStart=101, TravelEnd=102, Island=104, Spaceport=201,
  Candidate=300, BlockWest=301, BlockEast=302, BlockNorth=303,
  BlockSouth=304, KeptFree=305, Puzzle=306
}
export interface LayoutRandom { next(): number; modulo(n: number): number; }
export interface WorldLayout {
  typeMap: number[];
  orderMap: number[];
  puzzleCount: number;
  blockadeCount: number;
  travelCount: number;
}
const directions = [[-1,0],[1,0],[0,-1],[0,1]] as const;
const distance = (x: number,y: number) => Math.max(5-x,x-4,5-y,y-4);
const inBounds = (x: number,y: number) => x>=0 && x<10 && y>=0 && y<10;
const blockerForNeighbor = (dx: number,dy: number) =>
  dx<0?LayoutType.BlockEast:dx>0?LayoutType.BlockWest:dy<0?LayoutType.BlockSouth:LayoutType.BlockNorth;

export function generateLayout(random: LayoutRandom, size: 'small'|'medium'|'large'): WorldLayout {
  const map: number[] = Array(100).fill(LayoutType.None);
  const order: number[] = Array(100).fill(-1);
  const at = (x: number,y: number) => inBounds(x,y)?map[x+10*y]:LayoutType.None;
  const put = (x: number,y: number,value: number) => { if(inBounds(x,y)) map[x+10*y]=value; };
  const free = (value: number) => value===LayoutType.None || value===LayoutType.KeptFree;
  const inward = (value: number) => [LayoutType.Empty,LayoutType.TravelStart,LayoutType.Spaceport,LayoutType.Puzzle].includes(value);
  const travelTarget=random.modulo(3), blockadeTarget=random.modulo(4);
  random.next();
  const portX=4+random.modulo(2),portY=4+random.modulo(2);
  for(const i of [44,45,54,55]) map[i]=LayoutType.Empty;
  put(portX,portY,LayoutType.Spaceport);
  const ranges = size==='small'?[[5,8],[4,6],[1,1],[1,1]]:
    size==='large'?[[6,12],[6,12],[6,11],[4,11]]:[[5,9],[5,9],[4,8],[3,8]];
  const drawRange = (i: number) => ranges[i][0]+random.modulo(ranges[i][1]-ranges[i][0]+1);
  let placedTravels=0,placedBlockades=0;

  const ring = (iteration: number,remaining: number) => {
    const min=5-iteration,max=4+iteration,variance=iteration*2;
    const probability=iteration===2?9:iteration===3?4:5;
    const threshold=iteration===4?1:2;
    const travelThreshold=iteration===2?1:iteration===3?3:6;
    for(let attempt=0;attempt<145;attempt++) {
      let x: number,y: number;
      if(random.modulo(2)===0) { y=random.modulo(2)===0?max:min;x=min+random.modulo(variance); }
      else { x=random.modulo(2)===0?max:min;y=min+random.modulo(variance); }
      let neighbor=LayoutType.None;
      if(at(x,y)===LayoutType.None) {
        for(const [dx,dy] of directions) {
          neighbor=at(x+dx,y+dy);
          if(free(neighbor)) continue;
          const perpendicularFree=free(at(x+dy,y+dx)) && free(at(x-dy,y-dx));
          const block=blockerForNeighbor(dx,dy);
          if(inward(neighbor)) {
            const shouldBlock=placedBlockades<blockadeTarget && random.modulo(probability)<threshold;
            if(shouldBlock) {
              if(distance(x+dx,y+dy)<iteration) {
                if(perpendicularFree) {
                  put(x,y,block);put(x+dy,y+dx,LayoutType.KeptFree);put(x-dy,y-dx,LayoutType.KeptFree);
                  put(x-dx,y-dy,LayoutType.Candidate);
                  put(x+dy-dx,y+dx-dy,LayoutType.KeptFree);put(x-dy-dx,y-dx-dy,LayoutType.KeptFree);
                  placedBlockades++;remaining--;
                } else if(directions.every(([a,b])=>at(x+a,y+b)<300)) { put(x,y,LayoutType.Empty);remaining--; }
              }
            } else if(directions.every(([a,b])=>at(x+a,y+b)<300)) { put(x,y,LayoutType.Empty);remaining--; }
          } else if((neighbor===LayoutType.Candidate || neighbor===block) && perpendicularFree) {
            put(x,y,LayoutType.Candidate);put(x+dy,y+dx,LayoutType.KeptFree);put(x-dy,y-dx,LayoutType.KeptFree);remaining--;
          }
          break;
        }
        if(at(x,y)===LayoutType.Empty && placedTravels<travelTarget &&
           (random.next()&7)<travelThreshold && neighbor!==LayoutType.TravelStart && iteration>2) {
          put(x,y,LayoutType.TravelStart);placedTravels++;
        }
      }
      if(remaining<1) break;
    }
  };
  ring(2,Math.min(12,drawRange(0)+travelTarget+blockadeTarget));
  ring(3,drawRange(1));ring(4,drawRange(2));

  // The original's final expansion is bounded to 401 random perimeter attempts.
  let edgeBudget=drawRange(3);
  for(let attempt=0;attempt<401;attempt++) {
    const horizontalEdge=random.modulo(2)===0;
    let x: number,y: number;
    if(horizontalEdge) { y=random.modulo(2)===0?9:0;x=random.modulo(10); }
    else { x=random.modulo(2)===0?9:0;y=random.modulo(10); }
    if(at(x,y)===LayoutType.None) {
      const dx=horizontalEdge?0:x===0?-1:1,dy=horizontalEdge?(y===0?-1:1):0;
      const neighbor=at(x-dx,y-dy);
      if(!free(neighbor)) {
        if(inward(neighbor)) { put(x,y,LayoutType.Empty);edgeBudget--; }
        else {
          const reserveSides = () => { put(x+dy,y+dx,LayoutType.KeptFree);put(x-dy,y-dx,LayoutType.KeptFree); };
          if(neighbor===LayoutType.Candidate) { put(x,y,LayoutType.Candidate);reserveSides(); }
          else if(neighbor===(dx<0?LayoutType.BlockWest:dx>0?LayoutType.BlockEast:dy<0?LayoutType.BlockNorth:LayoutType.BlockSouth)) {
            const side1=at(x+dy,y+dx),side2=at(x-dy,y-dx);
            if((side1===0||side1>303) && (side2===0||side2>303)) {
              put(x,y,LayoutType.Candidate);reserveSides();edgeBudget--;
            }
          }
        }
      }
    }
    if(edgeBudget<1) break;
  }

  for(let island=0;island<placedTravels;island++) {
    for(let attempt=0;attempt<201;attempt++) {
      const side=random.modulo(4);
      const point=(i: number): [number,number] => side===0?[0,i]:side===1?[i,0]:side===2?[i,9]:[9,i];
      const inwardDelta=side===0?[1,0]:side===1?[0,1]:side===2?[0,-1]:[-1,0];
      let current=0,longest=0,start=0;
      for(let i=0;i<=10;i++) {
        const [x,y]=point(i);
        if(i<10 && at(x,y)===0 && free(at(x+inwardDelta[0],y+inwardDelta[1]))) current++;
        else { if(current>longest) { longest=current;start=i-current; }current=0; }
      }
      if(side<2?longest<3:longest<4) continue;
      if(longest===3 && start>0 && start<7) continue;
      const length=longest===3?2:Math.min(longest-2,4);
      const firstEndpoint=(random.next()&1)!==0;
      if(start>0 && start+length<10) start++;
      for(let i=0;i<length;i++) { const [x,y]=point(start+i);put(x,y,LayoutType.Island); }
      const [x,y]=point(firstEndpoint?start:start+length-1);put(x,y,LayoutType.TravelEnd);
      break;
    }
  }

  let available=0,travelCount=0,blockadeCount=0;
  for(const type of map) {
    if([LayoutType.Empty,LayoutType.Island,LayoutType.Candidate].includes(type)) available++;
    else if(type===LayoutType.TravelStart) travelCount++;
    else if(type>=301 && type<=304) blockadeCount++;
  }
  const targetCount=Math.max(4,Math.floor(available/4)+random.modulo(Math.floor(available/5)+1)-blockadeCount-travelCount-2);
  let puzzleCount=0;
  const puzzle=(x: number,y: number) => { put(x,y,LayoutType.Puzzle);order[x+10*y]=puzzleCount++; };
  for(let y=0;y<10;y++) for(let x=0;x<10;x++) {
    const type=at(x,y);
    let dx=0,dy=0;
    if(type===301)dx=-1;else if(type===302)dx=1;else if(type===303)dy=-1;else if(type===304)dy=1;else continue;
    if(at(x+dx,y+dy)!==LayoutType.Candidate) continue;
    if(inBounds(x+2*dx,y+2*dy) && at(x+2*dx,y+2*dy)===LayoutType.Candidate) puzzle(x+2*dx,y+2*dy);
    else puzzle(x+dx,y+dy);
  }
  for(let y=0;y<10;y++) for(let x=0;x<10;x++) {
    if(at(x,y)!==LayoutType.TravelEnd) continue;
    const direction=directions.find(([dx,dy])=>at(x+dx,y+dy)===LayoutType.Island);
    if(!direction) continue;
    const [dx,dy]=direction;let px=x,py=y;
    while(inBounds(px+dx,py+dy) && at(px+dx,py+dy)===LayoutType.Island) {px+=dx;py+=dy;}
    puzzle(px,py);
  }
  // Native attempts advance only for sufficiently distant candidates until 150.
  let countedAttempts=0;
  for(let budget=0;budget<10000;budget++) {
    const x=random.modulo(10);
    const y=countedAttempts<50 && x>0 && x<9?((random.next()&1)===0?9:0):random.modulo(10);
    if(puzzleCount>=targetCount) break;
    if(distance(x,y)>2 || countedAttempts>149) {
      if([LayoutType.Empty,LayoutType.Candidate].includes(at(x,y)) &&
         directions.every(([dx,dy])=>!inBounds(x+dx,y+dy)||at(x+dx,y+dy)!==LayoutType.Puzzle)) puzzle(x,y);
      if(puzzleCount>=targetCount || countedAttempts>200) break;
      countedAttempts++;
    }
    if(budget===9999) throw new Error('Native layout failed to place puzzle sectors');
  }
  const last=order.indexOf(puzzleCount-1);
  if(last>=0 && distance(last%10,Math.floor(last/10))<3) {
    const far=order.findIndex((v,i)=>v>=0 && v!==puzzleCount-1 && distance(i%10,Math.floor(i/10))>2);
    if(far>=0) {order[last]=order[far];order[far]=puzzleCount-1;}
  }
  return {typeMap:map,orderMap:order,puzzleCount,blockadeCount,travelCount};
}
