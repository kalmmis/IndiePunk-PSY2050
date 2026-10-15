#ifndef PSY_PS1_GAME_H
#define PSY_PS1_GAME_H
#include <stdint.h>
#include <psxpad.h>
typedef uint8_t u8;
typedef int16_t s16;
typedef uint16_t u16;
typedef int32_t s32;
typedef uint32_t u32;
#define ENEMIES 32
#define SHOTS 24
#define BULLETS 256
#define KEY_A PAD_CROSS
#define KEY_B PAD_CIRCLE
#define KEY_X PAD_SQUARE
#define KEY_Y PAD_R1
#define KEY_UP PAD_UP
#define KEY_DOWN PAD_DOWN
#define KEY_LEFT PAD_LEFT
#define KEY_RIGHT PAD_RIGHT
#define KEY_START PAD_START
#define KEY_SELECT PAD_SELECT
typedef struct { s16 x,y,vx,vy; u16 age,timer,interval; u8 active,type,move,attack,hp; } Enemy;
typedef struct { s16 x,y,vx,vy; u8 active,type; } Bullet;
typedef struct { u16 wait,type,arg,alt,count,first; } Row;
typedef struct { s16 x; u16 interval; u8 type,move,attack; } Spawn;
typedef struct { u16 type,arg; const u16 *speaker,*text; } Line;
extern const Row rows[];
extern const Spawn spawns[];
extern const Line lines[];
extern const u16 stageFirst[],stageLast[],fontAdvance[];
extern const s16 sintab[],turnX[],turnY[];
extern const u8 title_pic[],road_pic[],actors_pic[],actors_pal[],portraits_pic[],portraits_pal[],portraits_gray_pal[],font_pal[];
extern const u8 *fontPics[];
extern const u16 fontPages;
extern Enemy enemies[ENEMIES];
extern Bullet shots[SHOTS],bullets[BULLETS];
extern s16 px,py,bx,by,bossHp;
extern u16 frame,score,stage,row,wait,held,invincible,bossTick,gameTick;
extern u8 power,alive,bossMode,bossPhase,bossDone,bossKilled,mode,paused,assist;
extern u16 pad,pressed,nextStage,lineIndex;
void initVideo(void);
void titleScreen(void);
void playScreen(void);
void putText(u16 x,u16 y,char *s);
void clearText(void);
void uploadText(void);
void renderFrame(void);
void showLine(const Line *line);
void portrait(u16 arg);
void dialogueEnd(void);
void startStage(u16 n);
void stageStep(void);
void advanceDialogue(u8 skip);
void stepGame(void);
void beginBoss(u16 action);
u16 bossBeamAngle(u16 k);
void initAudio(void);
void audioFrame(void);
void playSound(u16 which);
#endif
