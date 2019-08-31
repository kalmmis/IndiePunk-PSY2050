using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using System;

/// <summary>
/// This script defines 'Enemy's' health and behavior. 
/// </summary>
public class Enemy_Boss : MonoBehaviour
{

    #region FIELDS
    [Tooltip("Health points in integer")]
    public int health;

    [Tooltip("Enemy's projectile prefab")]
    public List<GameObject> Projectiles;

    [Tooltip("VFX prefab generating after destruction")]
    public GameObject destructionVFX;
    public GameObject hitEffect;

    [HideInInspector] public int shotChance; //probability of 'Enemy's' shooting during tha path
    [HideInInspector] public float shotTimeMin, shotTimeMax; //max and min time for shooting from the beginning of the path
    #endregion
    List<GameObject> onDestroyExecutionList = new List<GameObject>();
    private void Start()
    {
        //Invoke("ActivateShooting",3);
        StartCoroutine(GetBossPatterun());
        health = 150;
    }

    IEnumerator GetBossPatterun()
    {
        //0-1간격
        yield return new WaitForSeconds(2);
        ////move

        //swing
        GameObject left = Instantiate(Projectiles[0], gameObject.transform.position, Quaternion.Euler(0, 0, -25));
        GameObject right = Instantiate(Projectiles[0], gameObject.transform.position, Quaternion.Euler(0, 0, 25));
        left.GetComponent<MovingSwing>().isRight = false;
        right.GetComponent<MovingSwing>().isRight = true;
        left.GetComponent<MovingSwing>().isPositive = true;
        right.GetComponent<MovingSwing>().isPositive = true;
        onDestroyExecutionList.Add(left.gameObject);
        onDestroyExecutionList.Add(right.gameObject);
        //1-2간격
        yield return new WaitForSeconds(1);
        GameObject.Destroy(left);
        GameObject.Destroy(right);
        GameObject[] windmill = {
            Instantiate(Projectiles[1], gameObject.transform.position, Quaternion.Euler(0, 0, 0)),
            Instantiate(Projectiles[1], gameObject.transform.position, Quaternion.Euler(0, 0, 90)),
            Instantiate(Projectiles[1], gameObject.transform.position, Quaternion.Euler(0, 0, 180)),
            Instantiate(Projectiles[1], gameObject.transform.position, Quaternion.Euler(0, 0, 270))
        };
        foreach (GameObject go in windmill)
        {
            onDestroyExecutionList.Add(go.gameObject);
        }
        //2-3간격
        yield return new WaitForSeconds(5);
        foreach (GameObject go in windmill)
        {
            GameObject.Destroy(go);
        }
        Vector3 p = gameObject.transform.position;
        p.x = p.x - 10;
        p.y = p.y - 3;
        while (true)
        {
            GameObject wall = Instantiate(Projectiles[2], p, Quaternion.Euler(0, 0, 90));
            onDestroyExecutionList.Add(wall);
            yield return new WaitForSeconds(2);
        }
    }
    //method of getting damage for the 'Enemy'
    public void GetDamage(int damage)
    {
        health -= damage;           //reducing health for damage value, if health is less than 0, starting destruction procedure
        if (health <= 0)
            Destruction();
        else
            Instantiate(hitEffect, transform.position, Quaternion.identity, transform);
    }

    //if 'Enemy' collides 'Player', 'Player' gets the damage equal to projectile's damage value
    private void OnTriggerEnter2D(Collider2D collision)
    {
        if (collision.tag == "Player")
        {
            //if (Projectile.GetComponent<Projectile>() != null)
            //    Player.instance.GetDamage(Projectile.GetComponent<Projectile>().damage);
            //else
            //    Player.instance.GetDamage(1);
        }
    }

    //method of destroying the 'Enemy'
    void Destruction()
    {
        Instantiate(destructionVFX, transform.position, Quaternion.identity);
        foreach (GameObject obj in onDestroyExecutionList)
        {
            Destroy(obj);
        }
        Destroy(gameObject);
    }

    internal Vector3 GetInitPosition()
    {
        return new Vector3(0, 18);
    }
}
