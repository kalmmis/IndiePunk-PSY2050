using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using System.Linq;
using System;
using UnityEngine.EventSystems;
using UnityEngine.SceneManagement;

#region Serializable classes
    [System.Serializable]
public class EnemyWaves 
{
    [Tooltip("time for wave generation from the moment the game started")]
    public float timeToStart;

    [Tooltip("Enemy wave's prefab")]
    public GameObject wave;
}

[System.Serializable]
public class EnemyWave_Indi
{
    [Tooltip("time for wave generation from the moment the game started")]
    public float interval;

    [Tooltip("Enemy wave's prefab")]
    public GameObject wave;
}

#endregion

public class LevelController : MonoBehaviour {
    //Serializable classes implements
    public GameObject powerUp;
    public float timeForNewPowerup;
    public GameObject[] planets;
    public Player player;
    public int playerLife;
    public float invincibleTime;
    public float timeBetweenPlanets;
    public float planetsSpeed;
    public bool isTest;
    public bool skipDialog;
    public bool wantStopTheWorld = false; //should be removed before release
    List<GameObject> planetsList = new List<GameObject>();
    public List<GameObject> enemyList = new List<GameObject>();
    public Dictionary<string, GameObject> enemyMap = new Dictionary<string, GameObject>();
    public int MAX_LEVEL;
    public int BOSS_TIMEOUT;
    private bool isBossKilled;

    Camera mainCamera;
    private Text stageText;
    private GameObject stageImage;
    private Text gameoverText;
    private GameObject gameoverImage;
    private GameObject UI;
    private Boolean clicked = false;

    
    PlayerShooting playerShootingScript;
    public Animator animator;
    public Vector3 lastPlayerPosition;
    private void Start()
    {
        UI = GameObject.FindGameObjectWithTag("UI");
        UI.SetActive(false);
        mainCamera = Camera.main;
        StartPlayer();
        if (!isTest) StartCoroutine( StartLevel(MAX_LEVEL) );
    }
    public void StartPlayer()
    {
        StartCoroutine(InitPlayer(1f));
    }
    public IEnumerator InitPlayer(float delayTime)
    {
        yield return new WaitForSeconds(delayTime);
        Player p = Instantiate(player, new Vector3(0, -5), Quaternion.identity);
        p.isInvincible = true;
        StartCoroutine(p.RemoveInvincible(invincibleTime));
        //animator.SetTrigger("TrigPlayerIdle");
        //playerShootingScript.TimeReset();
    }
    public IEnumerator StartLevel(int maxLevel)
    {
        for (int i = 1; i <= maxLevel; i++)
        {
            bool isFinishied = false;
            StartCoroutine(StringParser(ExcelParser.GetResource("level", i), ExcelParser.GetResource("dialog", i), (bool val)=> { isFinishied = val; }));
            if (wantStopTheWorld) StartCoroutine(StopTheWorld());
            yield return new WaitUntil(() => isFinishied);
        }
        SceneManager.LoadScene("StartMenu");

    }
    IEnumerator StopTheWorld()
    {
        yield return new WaitForSeconds(5);
        Debug.Log("Time scale" + Time.timeScale);
        Time.timeScale = 0;
        yield return new WaitForSeconds(5);
        Time.timeScale = 1;
    }
    public void ShowStageUI()
    {
        int level = 1; // 나중에 값 받아와야징
        stageImage = GameObject.Find("UIImageStage");
        stageText = GameObject.Find("UITextStage").GetComponent<Text>();
        stageText.text = "Stage" + level;

        stageImage.SetActive(true);
        Invoke("HideStageUI", 2);
    }
    public void HideStageUI()
    {
        stageText.text = "";
    }
    public void ShowGameOverUI()
    {
        gameoverImage = GameObject.Find("UIImageGameOver");
        gameoverText = GameObject.Find("UITextStage").GetComponent<Text>();
        gameoverText.text = "Game Over";
    }
    IEnumerator StringParser(string levelStr, string dialogs, System.Action<bool> callback) {
        Invoke("ShowStageUI", 2);

        char[] splitter = { '\n' };
        string[] levelRows = levelStr.Split(splitter);
        string[] dialogRows = dialogs.Split(splitter);

        IEnumerable<string> dialogRowsEnum = dialogRows.Cast<string>();
        IEnumerable<string[]> dialogRowArrays = dialogRowsEnum.Select(row => row.Split(','));
        string[][] dialogRowsDual = dialogRowArrays.ToArray<string[]>();
        Dictionary<string, int> dialogBook = new Dictionary<string, int>();
        for (int i = 0; i < dialogRowsDual.Length; i++)
        {
            string[] row = dialogRowsDual[i];
            if (row.Length == 1) continue;
            if (!"".Equals(row[0]))
            {
                dialogBook.Add(row[0], i);
            }
            else if ("event".Equals(row[1]) && "route".Equals(row[2]))
            {
                dialogBook.Add(row[3], i);
            }
            else if (row[1].Contains("select") && "end".Equals(row[2]))
            {
                dialogBook.Add(row[1], i);
            }
        }


        IEnumerable<string> levelRowsEnum = levelRows.Cast<string>();
        IEnumerable<string[]> levelRowArrays = levelRowsEnum.Select(row => row.Split(','));
        string[][] levelRowsDual = levelRowArrays.ToArray<string[]>();
        float y = 24;

        //levelRows
        for (int j = levelRowsDual.Length - 1; j > -1; j--)
        {
            Debug.Log(levelRows[j]);
            string[] fd = levelRowsDual[j];
            if (fd[0].Equals("")) fd[0] = "1";
            float duration = float.Parse(fd[0]);

            yield return new WaitForSeconds(duration + 2);
            for (int i = fd.Length - 1; i > 0; i -= 2) {
                if (fd[i - 1].Equals("")) continue;
                if (fd[1].Contains("load"))
                {
                    if (skipDialog) continue;
                    //stop the world!
                    string[] loadRow = fd[1].Split('=');
                    string dialogId = loadRow[1];
                    if (dialogId.Contains("Boss"))
                    {
                        dialogId = isBossKilled ? dialogId + 1 : dialogId + 0;
                    }
                    Debug.Log(dialogId);
                    int index = dialogBook[dialogId];
                    while (true)
                    {
                        string[] row = dialogRowsDual[index];
                        Debug.Log(row[1]);
                        if ("event".Equals(row[1]))
                        {
                            if (row[2].Contains("end"))
                            {
                                //대화끝
                                UI.SetActive(false);
                                break;
                            }
                            else if (row[2].Contains("show"))
                            {
                                //표시하기
                                string[] showParam = row[2].Split(' ');
                                string fileName = showParam[1];
                                string position = row[3];

                                //getFile
                                Debug.Log("Position : " + position);
                                //Resources.Load<Sprite>("Assets/Resources/" + fileName);
                                //setFileToPositoin
                                Transform leftTf = UI.transform.Find("Left");
                                Transform rightTf = UI.transform.Find("Right");
                                Image left = leftTf.GetComponent<Image>();
                                Image right = rightTf.GetComponent<Image>();
                                if ("left".Equals(position))
                                {
                                    leftTf.SetAsFirstSibling();
                                    left.sprite = Resources.Load<Sprite>("Image/" + fileName) as Sprite;
                                    left.color = new Color(255f, 255f, 255, 1f);
                                    if (right.sprite != null)
                                        right.color = new Color(100f, 100f, 100, 0.7f);
                                }
                                else
                                {
                                    rightTf.SetAsFirstSibling();
                                    right.sprite = Resources.Load<Sprite>("Image/" + fileName) as Sprite;
                                    right.color = new Color(255f, 255f, 255, 1f);
                                    if (left.sprite != null)
                                        left.color = new Color(100f, 100f, 100, 0.7f);

                                }
                            }
                            else if (row[2].Contains("play_se"))
                            {
                                //음악플레이
                            }
                            else if (row[2].Contains("move"))
                            {
                                //해당 루트로 이동
                                index = dialogBook[row[3]];
                                continue;
                            }
                            else if (row[2].Contains("route"))
                            {
                                //다음행으로 갈것
                                //암것도 안해도 됨
                            }

                            //yield return new WaitForSeconds(1);

                        }
                        else if ("l".Equals(row[1]))
                        {
                            //대사표시
                            UI.SetActive(true);
                            UI.transform.Find("Name").Find("Text").GetComponent<Text>().text = row[2];
                            UI.transform.Find("MainDialogue").Find("Text").GetComponent<Text>().text = row[3].Replace('$', ',').Replace(';','\n');

                            yield return new WaitForSeconds(1);
                            yield return new WaitUntil(() => Input.GetMouseButtonUp(0) && EventSystem.current.IsPointerOverGameObject());
                        }
                        else if (row[1].Contains("select"))
                        {
                            if (!"end".Equals(row[2]))
                            {
                                GameObject buttons = UI.transform.Find("Buttons").gameObject;
                                GameObject button1 = buttons.transform.Find("Button1").gameObject;
                                GameObject button2 = buttons.transform.Find("Button2").gameObject;
                                GameObject button3 = buttons.transform.Find("Button3").gameObject;


                                GameObject[] btnArr = new GameObject[] { button1, button2, button3 };

                                button1.SetActive(false);
                                button2.SetActive(false);
                                button3.SetActive(false);
                                buttons.SetActive(true);

                                int endIndex = dialogBook[row[1]];
                                for (int h = index; h <= endIndex; h++)
                                {
                                    string[] searching = dialogRowsDual[h];
                                    if (row[1].Equals(searching[1]) && searching[2].Contains("choice"))
                                    {
                                        int btnIndex = Int32.Parse("" + searching[2][searching[2].Length - 1]);

                                        int nextLine = h;
                                        btnArr[btnIndex - 1].transform.Find("Text").GetComponent<Text>().text = searching[3];
                                        btnArr[btnIndex - 1].GetComponent<Button>().onClick.AddListener(() =>
                                        {
                                            clicked = true;
                                            index = nextLine;
                                        });
                                        btnArr[btnIndex - 1].SetActive(true);
                                    }
                                }

                                yield return new WaitForSeconds(1);
                                yield return new WaitUntil(() =>
                                {
                                    if (clicked)
                                    {
                                        foreach (GameObject go in btnArr)
                                            go.GetComponent<Button>().onClick.RemoveAllListeners();
                                        clicked = false;
                                        return true;
                                    }
                                    else
                                        return false;
                                });
                                buttons.SetActive(false);
                            }
                        }
                        else
                        {
                            yield return new WaitForSeconds(1);
                        }
                        index++;
                    }
                }
                else if(fd[1].Contains("boss")) {
                    float bossInitTime = Time.time;
                    string[] loadRow = fd[1].Split('=');
                    string bossId = loadRow[1];
                    GameObject enemyRscr = Resources.Load<GameObject>("Enemies/" + bossId);
                    GameObject enemy = Instantiate(enemyRscr, enemyRscr.GetComponent<Enemy_Boss>().GetInitPosition(), Quaternion.identity);

                    yield return new WaitWhile(() => {
                        bool bossnotkill = enemy != null;
                        Debug.Log("Timeout : " + (Time.time - bossInitTime));
                        bool timeout = Time.time - bossInitTime > BOSS_TIMEOUT;
                        if (!bossnotkill)
                        {
                            isBossKilled = true;
                        }else if (timeout)
                        {
                            isBossKilled = false;
                            enemy.GetComponent<Enemy_Boss>().DestructionProject();
                            enemy.SetActive(false);
                            
                        }

                        return bossnotkill && !timeout;
                    });
                }
                else
                {
                    float xPosition = float.Parse(fd[i - 1]);
                    string type = fd[i];
                    Debug.Log(type);
                    GameObject enemyRscr = Resources.Load<GameObject>("Enemies/" + type.Substring(0, 1));
                    GameObject enemy = Instantiate(enemyRscr, new Vector3(((xPosition - 216) / 24), y), Quaternion.identity);
                    List<Pattern> pl = enemy.GetComponent<Enemy>().patternList;
                    Pattern newOne = new Pattern(type.Substring(0, 1), type.Substring(1, 1), type.Substring(2, 1), type.Substring(4, 3));
                    pl.Add(newOne);
                }
                
            }
        }
        callback(true);
    }

    //endless coroutine generating 'levelUp' bonuses. 
    IEnumerator PowerupBonusCreation()
    {
        while (true)
        {
            yield return new WaitForSeconds(timeForNewPowerup);
            Instantiate(
                powerUp,
                //Set the position for the new bonus: for X-axis - random position between the borders of 'Player's' movement; for Y-axis - right above the upper screen border 
                new Vector2(
                    UnityEngine.Random.Range(PlayerMoving.instance.borders.minX, PlayerMoving.instance.borders.maxX),
                    mainCamera.ViewportToWorldPoint(Vector2.up).y + powerUp.GetComponent<Renderer>().bounds.size.y / 2),
                Quaternion.identity
                );
        }
    }
}    
