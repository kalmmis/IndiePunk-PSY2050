using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// This script defines 'Enemy's' health and behavior. 
/// </summary>
public class Enemy : MonoBehaviour {

    #region FIELDS
    [Tooltip("Health points in integer")]
    public int health;

    //[Tooltip("Enemy's projectile prefab")]
    //public GameObject Projectile;

    [Tooltip("VFX prefab generating after destruction")]
    public GameObject destructionVFX;
    public GameObject hitEffect;
    
    [HideInInspector] public int shotChance; //probability of 'Enemy's' shooting during tha path
    [HideInInspector] public float shotTimeMin, shotTimeMax; //max and min time for shooting from the beginning of the path
    [Tooltip("Enemy's pattern prefab")]
    public List<Pattern> patternList = new List<Pattern>();
    Pattern pattern;
    int showUpTime;

    #endregion
    private void Start()
    {
        showUpTime = Time.frameCount;
        StartCoroutine(GetPattern());
        StartCoroutine(ActivateShooting());
        health = 10;
    }
    IEnumerator GetPattern()
    {
        foreach (Pattern p in patternList)
        {
            pattern = p;
            yield return new WaitForSeconds(p.duration);
        }
        
    }

    private void Update()
    {
        /// Debug.Log(pattern != null);
        if(pattern != null) { 
            pattern.Moving(this, 3f, showUpTime);
        }
    }
    //coroutine making a shot
    IEnumerator ActivateShooting()
    {
        while (true) {
            pattern.Attack(gameObject);
            yield return new WaitForSeconds(pattern.shotTime/60);
        }
    }

    //method of getting damage for the 'Enemy'
    public void GetDamage(int damage) 
    {
        health -= damage;           //reducing health for damage value, if health is less than 0, starting destruction procedure
        if (health <= 0)
            Destruction();
        else
            Instantiate(hitEffect,transform.position,Quaternion.identity,transform);
    }    

    //if 'Enemy' collides 'Player', 'Player' gets the damage equal to projectile's damage value
    private void OnTriggerEnter2D(Collider2D collision)
    {
        if (collision.tag == "Player")
        {
            if (pattern.p.GetComponent<Projectile>() != null) 
              Player.instance.GetDamage(pattern.p.GetComponent<Projectile>().damage);
            else 
              Player.instance.GetDamage(1);
        }
        if (collision.tag == "Boundary")
        {
            //if (pattern.p.GetComponent<Projectile>() != null)
            //    Player.instance.GetDamage(pattern.p.GetComponent<Projectile>().damage);
            //else
        }
    }

    //method of destroying the 'Enemy'
    void Destruction()                           
    {        
        Instantiate(destructionVFX, transform.position, Quaternion.identity); 
        Destroy(gameObject);
    }
}
