using System.Collections;
using System.Collections.Generic;
using UnityEngine;

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

    public GameObject powerUp;
    public float timeForNewPowerup;
    public GameObject[] planets;
    public float timeBetweenPlanets;
    public float planetsSpeed;
    List<GameObject> planetsList = new List<GameObject>();

    Camera mainCamera;   

    private void Start()
    {
        mainCamera = Camera.main;
        //for each element in 'enemyWaves' array creating coroutine which generates the wave
        //for (int i = 0; i<20; i++) 
        {
            
        }
        StartCoroutine(CreateEnemyWave_indi(enemyWaves_indi.interval, enemyWaves_indi.wave));
        StartCoroutine(PowerupBonusCreation());
        StartCoroutine(PlanetsCreation());
    }
    
    //Create a new wave after a delay
    IEnumerator CreateEnemyWave(float delay, GameObject Wave) 
    {
        if (delay != 0)
            yield return new WaitForSeconds(delay);
        if (Player.instance != null)
            Instantiate(Wave);
    }

    IEnumerator CreateEnemyWave_indi(float interval, GameObject Wave)
    {
        int i = 0;
        while (i < 3)
        {
            yield return new WaitForSeconds(interval);
            if (Player.instance != null)
            {
                System.Random rand = new System.Random();
                int coin = (int)rand.Next(11);
                float glich = (float)rand.NextDouble() * 15;
                if (coin > 5) glich *= -1.0f;

                Transform[] arr = Wave.GetComponent<Wave>().pathPoints;
                int len = arr.Length;
                for( int j = 0; j < len; j++)
                {
                    Debug.Log("1"+arr[j].position.x+" "+ arr[j].position.y + " " + arr[j].position.z);
                    arr[j].position.Set(arr[j].position.x + 10, arr[j].position.y, arr[j].position.z);
                    Debug.Log("2" + arr[j].position.x + " " + arr[j].position.y + " " + arr[j].position.z);
                }
                Instantiate(Wave);
            }
            i++;
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
                    Random.Range(PlayerMoving.instance.borders.minX, PlayerMoving.instance.borders.maxX), 
                    mainCamera.ViewportToWorldPoint(Vector2.up).y + powerUp.GetComponent<Renderer>().bounds.size.y / 2), 
                Quaternion.identity
                );
        }
    }

    IEnumerator PlanetsCreation()
    {
        //Create a new list copying the arrey
        for (int i = 0; i < planets.Length; i++)
        {
            planetsList.Add(planets[i]);
        }
        yield return new WaitForSeconds(10);
        while (true)
        {
            ////choose random object from the list, generate and delete it
            int randomIndex = Random.Range(0, planetsList.Count);
            GameObject newPlanet = Instantiate(planetsList[randomIndex]);
            planetsList.RemoveAt(randomIndex);
            //if the list decreased to zero, reinstall it
            if (planetsList.Count == 0)
            {
                for (int i = 0; i < planets.Length; i++)
                {
                    planetsList.Add(planets[i]);
                }
            }
            newPlanet.GetComponent<DirectMoving>().speed = planetsSpeed;

            yield return new WaitForSeconds(timeBetweenPlanets);
        }
    }
}
