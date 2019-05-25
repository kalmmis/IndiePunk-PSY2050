﻿using System.Collections;
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
    public Dictionary<string, GameObject> enemyMap = new Dictionary<string, GameObject>();

    Camera mainCamera;
    readonly string level1String = "0.5,,,,,,,,,432,ADA||1,48,ACA,,,,,,,,||0.1,,,,,,,,,432,ABX||0.1,,,,,,,,,432,ABX||0.1,,,,,,,,,432,ABX||0.1,48,ABX,,,,,,,,||0.1,48,ABX,,,,,,,,||1,48,ABX,,,,,,,,||1,,,144,AAB,,,336,AAB,,||1,48,AAA,,,240,AAA,,,432,AAA||0.1,,,,,,,,,432,AAX||0.1,,,,,,,,,432,AAX||0.1,,,,,,,,,432,AAX||0.1,48,AAX,,,,,,,,||0.1,48,AAX,,,,,,,,||1,48,AAX,,,,,,,,||0.5,48,AAA,144,AAA,240,AAA,336,AAA,432,AAA";

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
        float y = 24;
        for (int j = rowsDual.Length - 1; j > -1; j--)
        {
            string[] fd = rowsDual[j];
            if (fd[0].Equals("")) fd[0] = "1";
            float duration = float.Parse(fd[0]);
            
            yield return new WaitForSeconds(duration+2);
            for (int i = fd.Length - 1; i > 0 ; i -= 2) {
                if (fd[i - 1].Equals("")) continue;
                float xPosition = float.Parse(fd[i-1]);
                string type = fd[i];
                Debug.Log(type);
                GameObject enemy = Instantiate(enemyList[0], new Vector3(((xPosition - 216) / 24),y ), Quaternion.identity);
                List<Pattern> pl = enemy.GetComponent<Enemy>().patternList;
                Pattern newOne = new Pattern();
                newOne.duration = 3;
                newOne.attackType = "B";
                newOne.movingType = "B";
                newOne.shotTime = 1;
                newOne.p = Resources.Load<GameObject>("Enemy_Short_Lazer").GetComponent<Projectile>();
                Debug.Log(newOne.p);
                pl.Add(newOne);
            }
        }
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