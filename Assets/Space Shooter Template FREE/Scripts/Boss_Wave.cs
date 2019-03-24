using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System;

public class Boss_Wave : MonoBehaviour
{
    #region FIELDS
    [Tooltip("Enemy's prefab")]
    public GameObject enemy;

    [Tooltip("a number of enemies in the wave")]
    public int count;

    [Tooltip("path passage speed")]
    public float speed;
    public Shooting shooting;

    [Tooltip("if testMode is marked the wave will be re-generated after 3 sec")]
    public bool testMode;
    #endregion

    private void Start()
    {
        StartCoroutine(CreateBossEnemy());
    }

    IEnumerator CreateBossEnemy() //depending on chosed parameters generating enemies and defining their parameters
    {
        //for (int i = 0; i < count; i++)
        {
            GameObject newEnemy;
            newEnemy = Instantiate(enemy, enemy.transform.position, Quaternion.identity);
            Enemy_Boss enemyComponent = newEnemy.GetComponent<Enemy_Boss>();
            newEnemy.SetActive(true);
        }
        if (testMode)       //if testMode is activated, waiting for 3 sec and re-generating the wave
        {
            yield return new WaitForSeconds(3);
            StartCoroutine(CreateBossEnemy());
        }
        //else Destroy(gameObject);
    }
    Vector3 Interpolate(Vector3[] path, float t)
    {
        int numSections = path.Length - 3;
        int currPt = Mathf.Min(Mathf.FloorToInt(t * numSections), numSections - 1);
        float u = t * numSections - currPt;
        Vector3 a = path[currPt];
        Vector3 b = path[currPt + 1];
        Vector3 c = path[currPt + 2];
        Vector3 d = path[currPt + 3];
        return 0.5f * ((-a + 3f * b - 3f * c + d) * (u * u * u) + (2f * a - 5f * b + 4f * c - d) * (u * u) + (-a + c) * u + 2f * b);
    }
    
}
