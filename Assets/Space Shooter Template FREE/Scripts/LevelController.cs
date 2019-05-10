using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using System;

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
    public EnemyWaves[] enemyWaves;
    public EnemyWave_Indi enemyWaves_indi;
    public int indeWavesCount;
    public Boss_Wave bossWave;
    public GameObject powerUp;
    public float timeForNewPowerup;
    public GameObject[] planets;
    public float timeBetweenPlanets;
    public float planetsSpeed;
    List<GameObject> planetsList = new List<GameObject>();
    public List<GameObject> enemyList = new List<GameObject>();

    Camera mainCamera;
    readonly string level1String = "0.5,,,,,,,,,432,DA||1,48,CA,,,,,,,,||0.1,,,,,,,,,432,BX||0.1,,,,,,,,,432,BX||0.1,,,,,,,,,432,BX||0.1,48,BX,,,,,,,,||0.1,48,BX,,,,,,,,||1,48,BX,,,,,,,,||1,,,144,AB,,,336,AB,,||1,48,AA,,,240,AA,,,432,AA||0.1,,,,,,,,,432,AX||0.1,,,,,,,,,432,AX||0.1,,,,,,,,,432,AX||0.1,48,AX,,,,,,,,||0.1,48,AX,,,,,,,,||1,48,AX,,,,,,,,||0.5,48,AA,144,AA,240,AA,336,AA,432,AA";

    private void Start()
    {
        mainCamera = Camera.main;
        StartLevel();
        //StartCoroutine(CreateEnemyWave_indi(enemyWaves_indi.interval, enemyWaves_indi.wave));
        //StartCoroutine(PowerupBonusCreation());
        //StartCoroutine(PlanetsCreation());
    }
    public void StartLevel()
    {
        StartCoroutine(StringParser(level1String));
    }
    IEnumerator StringParser(string str)
    {
        char[] splitter = { '|', '|'};
        string[] rows = level1String.Split(splitter);
        IEnumerable<string> rowsEnum = rows.Cast<string>();
        IEnumerable<string[]> rowArrays = rowsEnum.Select(row => row.Split(','));
        string[][] rowsDual = rowArrays.ToArray<string[]>();
        float y = 0;
        for (int j = rowsDual.Length - 1; j > -1; j--)
        {

            string[] fd = rowsDual[j];
            if (fd[0].Equals("")) fd[0] = "1";
            float yV = float.Parse(fd[0]);
            
            y += yV;
            yield return new WaitForSeconds(yV);
            //for (int i = 1; i < fd.Length; i += 2) {
            for (int i = fd.Length - 1; i > 0 ; i -= 2) {
                if (fd[i - 1].Equals("")) continue;
                float xPosition = float.Parse(fd[i-1]);
                string type = fd[i];
                Instantiate(enemyList[0], new Vector3(((xPosition - 216) / 24),y ), Quaternion.identity);
            }
        }
    }
    //Create a new wave after a delay
    //IEnumerator CreateEnemyWave(float delay, GameObject Wave) 
    //{
    //    if (delay != 0)
    //        yield return new WaitForSeconds(delay);
    //    if (Player.instance != null)
    //        Instantiate(Wave);
    //}

    //IEnumerator CreateEnemyWave_indi(float interval, GameObject Wave)
    //{
    //    int i = 0;
    //    while (i < indeWavesCount)
    //    {
    //        yield return new WaitForSeconds(interval);
    //        if (Player.instance != null)
    //        {
    //            System.Random rand = new System.Random();
    //            int coin = (int)rand.Next(11);
    //            float glich = (float)rand.NextDouble() * 15;
    //            if (coin > 5) glich *= -1.0f;

    //            Transform[] arr = Wave.GetComponent<Wave>().pathPoints;
    //            int len = arr.Length;
    //            for( int j = 0; j < len; j++)
    //            {
    //                arr[j].position.Set(arr[j].position.x + 10, arr[j].position.y, arr[j].position.z);
    //            }
    //            Instantiate(Wave);

    //        }
    //        i++;
    //    }
    //    yield return new WaitForSeconds(interval);
    //    Instantiate(bossWave);
    //}

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

    //IEnumerator PlanetsCreation()
    //{
    //    //Create a new list copying the arrey
    //    for (int i = 0; i < planets.Length; i++)
    //    {
    //        planetsList.Add(planets[i]);
    //    }
    //    yield return new WaitForSeconds(10);
    //    while (true)
    //    {
    //        ////choose random object from the list, generate and delete it
    //        int randomIndex = Random.Range(0, planetsList.Count);
    //        GameObject newPlanet = Instantiate(planetsList[randomIndex]);
    //        planetsList.RemoveAt(randomIndex);
    //        //if the list decreased to zero, reinstall it
    //        if (planetsList.Count == 0)
    //        {
    //            for (int i = 0; i < planets.Length; i++)
    //            {
    //                planetsList.Add(planets[i]);
    //            }
    //        }
    //        newPlanet.GetComponent<DirectMoving>().speed = planetsSpeed;

    //        yield return new WaitForSeconds(timeBetweenPlanets);
    //    }
    //}
}
