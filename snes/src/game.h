#ifndef PSY_GAME_H
#define PSY_GAME_H
#include <snes.h>
#define ENEMIES 12
#define SHOTS 12
#define BULLETS 48
typedef struct { s16 x,y,vx,vy; u16 age,timer,interval; u8 active,type,move,attack,hp; } Enemy;
typedef struct { s16 x,y,vx,vy; u8 active,type; } Bullet;
typedef struct { u16 wait,type,arg,alt,count,first; } Row;
typedef struct { s16 x; u16 interval; u8 type,move,attack; } Spawn;
typedef struct { u16 type,arg,size; u8 *pic,*map; } Line;
extern const Row rows[];
extern const Spawn spawns[];
extern const Line lines[];
extern const u16 stageFirst[],stageLast[];
extern const s16 sintab[];
extern const s16 turnX[],turnY[];
extern u8 sprites_pic,sprites_pal,road_pic,road_map,road_pal,title_pic,title_map,title_pal,font_pic;
extern const u16 road_size,title_size;
extern u8 *portraitPics[],*portraitPals[];
extern Enemy enemies[ENEMIES];
extern Bullet shots[SHOTS],bullets[BULLETS];
extern s16 px,py,bx,by,bossHp;
extern u16 frame,score,stage,row,wait,held,invincible,bossTick,gameTick;
extern u8 power,alive,bossMode,bossPhase,bossDone,bossKilled,mode,paused,assist;
extern u16 pad,pressed,nextStage,lineIndex;
extern u16 textMap[1024];
void initVideo(void);
void titleScreen(void);
void playScreen(void);
void putText(u16 x,u16 y,char *s);
void clearText(void);
void uploadText(void);
void drawScene(void);
void showLine(const Line *line);
void portrait(u16 arg);
void dialogueEnd(void);
void startStage(u16 n);
void stageStep(void);
void advanceDialogue(u8 skip);
void stepGame(void);
void beginBoss(u16 action);
void initAudio(void);
void audioFrame(void);
void playSound(u16 which);
#endif
