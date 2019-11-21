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
    public bool isStarted = false;
    private bool isDestroyedVal = false;
    private float bossInitTime;

    private void Start()
    {
        health = 1000;
        //Invoke("ActivateShooting",3);
        StartCoroutine(GetBossPattern());
    }

    IEnumerator GetBossPattern()
    {
        //0-1간격
        while (Vector3.Distance(transform.position, new Vector3(0, 15)) > 0.5f)
        {
            transform.position = Vector3.MoveTowards(transform.position, new Vector3(0, 15), 5f * Time.deltaTime);
            yield return null;
        }

        yield return new WaitUntil(() => isStarted);
        while (Vector3.Distance(transform.position, new Vector3(0, 8)) > 0.1f)
        {
            transform.position = Vector3.MoveTowards(transform.position, new Vector3(0, 8), 5f * Time.deltaTime);
            yield return null;
        }
        ////move
        health = 600;
        //Showing UI

        //swing
        GameObject left = Instantiate(Projectiles[0], gameObject.transform.position, Quaternion.Euler(0, 0, -90));
        GameObject right = Instantiate(Projectiles[0], gameObject.transform.position, Quaternion.Euler(0, 0, 90));
        left.GetComponent<MovingSwing>().isRight = false;
        right.GetComponent<MovingSwing>().isRight = true;
        left.GetComponent<MovingSwing>().isPositive = true;
        right.GetComponent<MovingSwing>().isPositive = true;
        onDestroyExecutionList.Add(left.gameObject);
        onDestroyExecutionList.Add(right.gameObject);
        //1-2간격
        //20초가 지나거나 health 가 100이 되거나!
        yield return new WaitUntil(() =>
        {
            return health < 400 || (Time.time - bossInitTime > 30);
        });
        

        GameObject.Destroy(left);
        GameObject.Destroy(right);
        while (Vector3.Distance(transform.position, new Vector3(0, 8)) > 0.1f)
        {
            transform.position = Vector3.MoveTowards(transform.position, new Vector3(0, 8), 3f * Time.deltaTime);
            yield return null;
        }
        yield return new WaitForSeconds(3);
        health = 400;
        if (!isDestroyedVal)
        {
            GameObject[] windmill = {
                Instantiate(Projectiles[1], gameObject.transform.position, Quaternion.Euler(0, 0, 45)),
                Instantiate(Projectiles[1], gameObject.transform.position, Quaternion.Euler(0, 0, 135)),
                Instantiate(Projectiles[1], gameObject.transform.position, Quaternion.Euler(0, 0, 225)),
                Instantiate(Projectiles[1], gameObject.transform.position, Quaternion.Euler(0, 0, 315))
            };
            foreach (GameObject go in windmill)
            {
                onDestroyExecutionList.Add(go.gameObject);
            }
            yield return new WaitUntil(() =>
            {
                return (health < 200 || (Time.time - bossInitTime > 60));
            });
            foreach (GameObject go in windmill)
            {
                Destroy(go);
            }
        }
        //2-3간격
        //20초가 지나거나 health 가 100이 되거나!
        if (!isDestroyedVal)
        {
            Debug.Log("Pattern3");
            Debug.Log("isDestroyedVal "+ isDestroyedVal);
            health = 200;
            while (Vector3.Distance(transform.position, new Vector3(0, 20)) > 0.1f)
            {
                transform.position = Vector3.MoveTowards(transform.position, new Vector3(0, 20), 5f * Time.deltaTime);
                yield return null;
            }
            Vector3 p = gameObject.transform.position;
            Invoke("BossPattern1Add", 10f);
            while (!isDestroyedVal && true)
            {
                if (health < 30 || (Time.time - bossInitTime > 80))
                {
                    break;
                }
                GameObject wall = Instantiate(Projectiles[2], new Vector3(p.x - 10, p.y - 3), Quaternion.Euler(0, 0, 90));
                onDestroyExecutionList.Add(wall);
                yield return new WaitForSeconds(2);
            }
            foreach (GameObject obj in onDestroyExecutionList)
            {
                Destroy(obj);
            }
            isDestroyedVal = true;
        }
    }
    //method of getting damage for the 'Enemy'
    public void BossPattern1Add()
    {
    //swing
        GameObject left2 = Instantiate(Projectiles[3], gameObject.transform.position, Quaternion.Euler(0, 0, -90));
        GameObject right2 = Instantiate(Projectiles[3], gameObject.transform.position, Quaternion.Euler(0, 0, 90));
        left2.GetComponent<MovingSwing>().isRight = false;
        right2.GetComponent<MovingSwing>().isRight = true;
        left2.GetComponent<MovingSwing>().isPositive = true;
        right2.GetComponent<MovingSwing>().isPositive = true;
        onDestroyExecutionList.Add(left2.gameObject);
        onDestroyExecutionList.Add(right2.gameObject);
     }
    public void GetDamage(int damage)
    {
        //damage = 30;
        health -= damage;           //reducing health for damage value, if health is less than 0, starting destruction procedure
        if (health <= 0)
            isDestroyedVal = true;
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

    public void Destruction()
    {
        foreach (GameObject obj in onDestroyExecutionList)
        {
            Destroy(obj);
        }
        while (Vector3.Distance(transform.position, new Vector3(0, 18)) > 0.5f)
        {
            transform.position = Vector3.MoveTowards(transform.position, new Vector3(0, 18), 5f * Time.deltaTime);
        }
        Instantiate(destructionVFX, transform.position, Quaternion.identity);

        Destroy(gameObject);
    }

    public void DestructionProject()
    {
        foreach (GameObject obj in onDestroyExecutionList)
        {
            Destroy(obj);
        }
        Destroy(gameObject);
    }
    public void setActive(bool val)
    {
        isStarted = val;
        if (val)
        {
            bossInitTime = Time.time;
        }
    }
    internal Vector3 GetInitPosition()
    {
        return new Vector3(0, 23);
    }
    public bool isDestroyed()
    {
        return isDestroyedVal;
    }
    private void OnDestroy()
    {
        
    }
}
