/*
json을 js파일로 변환한 뒤 아래와 같이 하면 주석을 달아도 문제가 되지 않는다.

*/

module.exports = {
    "MainStory001_start" : { 
    // 스토리를 구분할 있는 고유 id이다. 
    // 기능1) LoadStory(id); 등을 통해 해당 id 를 불러오면 이하의 title 정보와 data 를 로드한다.
        "title": "시작의 서", 
        // 해당 id 의 한글 이름을 정의한다.
        // 현재 진행 중인 스토리 id 를 한글로 뭐라고 부르면 되는지 커뮤니케이션할 때 필요한 정보이며,
        // 더불어 플레이어도 게임 UI 상에서 자신이 어떤 스토리를 진행하고 있는지 이 이름을 통해 알 수 있다.
        "data": [
            {"NpcNameText": "player", "text": "여긴 어디지?"},
            //기능 1) player 변수에 지정된 한글 네이밍을 유니티 상의 NpcNameText 객체에 출력한다.
            //   ㄴ네이밍을 정의한 파일은 asset/scripts/npcnamelist.txt 를 참조한다.
            //기능 2) 그와 동시에 text 에 적힌 값도 유니티 상의 StoryText 객체에 출력한다.
            //기능 3) text를 한 줄 출력한 후에는 다음 입력을 기다리며 해당 화면에서 pause 한다.
            {"NpcNameText": "player", "text": "누군가 다가오고 있어."},
            //기능 1) 윗행에서 아무 키나 입력하면 현재 행으로 넘어온다.
            //기능 2) NpcNameText 는 값이 동일하니 변하지 않고 text만 변화한다. 
            {"Command":{"NpcBackgroundImage1" : "npc1"}},
            //데이터의 첫 키 값이 Command 이면 커맨드의 키값을 조합하여 이하와 같은 함수를 만들어 유니티 상에서 호출한다.
            //기능 1) 여기서 호출하고자 하는 Command 는 NpcBackgroundImage1(npc1);이다.
            //        ㄴ위 함수는 NpcBackgroundIame1 에 Assets/Image/npc1.jpg라는 이미지를 삽입하는 함수이다.
	        {"NpcNameText" : "npc1", "text" : "어머, 안녕하세요."},
	        {"NpcNameText" : "npc1", "text" : "이런 외진 곳에 사람이 방문할 줄은 몰랐네요."},
	        {"NpcNameText" : "player", "text" : "여기는 어디야?"},
	        {"NpcNameText" : "npc1", "text" : "여기는 히랄다의 숲이에요.\n저를 따라오세요."},
	        {"Command":{"NpcBackgroundImage1" : "null"}},
            //기능 1) 여기서 호출하고자 하는 Command 는 NpcBackgroundImage1(null); 이다.
            //       ㄴ 위 함수는 NpcBackgroundIame1 에서 모든 이미지를 제거하라는 함수이다.
	        {"NpcNameText" : "blank", "text" : "여성은 숲속으로 사라졌다.\n뒤를 따라가보자."}
        ]
   }
},

{
    "MainStory002_selection" : { 
        "title": "선택지에 대해", 
        "data": [
            {"NpcNameText" : "player", "text" : "저 멀리서 누군가 다가온다."},
            {"NpcNameText" : "player", "text" : "다가온 것은 <npc2>였다.\n그녀가 대뜸 물었다."},
            //기능 1) text 내에 <> 꺽쇄 괄호 + npc 이름을 넣으면 해당 npc의 이름을 출력한다.
            //       즉, "다가온 것은 고나라였다." 라고 나온다.
            {"SetRoute" : "RouteMainStory002_1"},
            //기능 1) SetRoute 는 스토리의 특정 지점을 설정한다.
            //기능 2) SetRoute 에 입력된 값을 id 삼아서 해당 지점을 기억하는 것이다.
            {"Command":{"NpcBackgroundImage3" : "npc2"}},
            {"NpcNameText" : "npc2", "selection" : "3+4는 몇일까요?"},
            //기능 1) text 대신 selection 을 선언하면 이후에 choice 명령이 올 수 있다.
            //기능 2) selection 에 입력한 값은 text 와 동일하게 유니티 상의 StoryText 객체에 출력한다.

            {"choice1_text" : "6이다.", "choice1" : [
                {"NpcNameText" : "npc2", "text" : "틀렸습니다.\n다시 한 번 물어볼게요."},
                {"Move" : "RouteMainStory002_1"},
            ]},

            {"choice2_text" : "7이다.", "choice2" : [
                {"NpcNameText" : "npc2", "text" : "맞아요."},
                {"NpcNameText" : "npc2", "text" : "계산을 참 잘 하시네요."},
                {"Move" : "RouteMainStory002_2"},
            ]},

            // selection이 선언된 이후 나타난 choice1 과 choice2.
            // 선택지는 유니티 버튼 객체 갯수만큼 올 수 있으니 현재로서는 choice4까지 올 수 있다.
            // 기능1) choice1_text와 choice2_text 에 입력된 값은 버튼 객체인 ChoiceButtonText 에 출력된다. 
            // 기능2) 버튼1번을 선택하면 choice1 분기가 실행되고 버튼2번을 선택하면 choice2 분기가 실행된다.
            // 기능3) Move 명령어는 스토리 상에서 정의해둔 SetRoute 의 id 를 호출해 파싱 라인을 해당 행으로 이동시킨다.
            //       SetRoute 는 Move 명령어보다 앞에 나올 수도 뒤에 나올 수도 있다.

            {"SetRoute" : "RouteMainStory002_2"},
            {"NpcNameText" : "npc2", "text" : "그 말을 끝으로 <npc2>는 돌아가버렸다."},
            {"Command":{"NpcBackgroundImage3" : "null"}}
        ]
    }
}
